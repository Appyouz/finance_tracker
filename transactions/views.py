# views.py (modified new_transaction view)
import json
from django.db.models import Sum
from django.http import JsonResponse, HttpResponseRedirect, QueryDict
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_http_methods
from transactions.forms import TransactionForm
from .models import Transaction
from django.db.models import Sum
from datetime import date

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def get_category_totals():
    """
    Returns a list of dictionaries with each category and the total sum of amounts.
    """
    return list(
        Transaction.objects
        .values('category')
        .annotate(total=Sum('amount'))
        .order_by('category')
    )

def get_total_amount():
    """
    Returns the total sum of all transaction amounts.
    """
    total = Transaction.objects.aggregate(total=Sum("amount"))["total"]
    return total or 0  # Return 0 if there are no transactions

# -----------------------------------------------------------------------------
# Views
# -----------------------------------------------------------------------------
def index(request):
    """
    Index page view that shows the list of transactions and the spending chart.
    For AJAX requests, returns JSON data with transactions and category totals.
    """
    transactions = Transaction.objects.all()
    total = get_total_amount()
    category_totals = get_category_totals()
    today = date.today() # Get today's date

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'transactions': list(transactions.values()),
            'category_totals': category_totals,
            'today': today.strftime('%Y-%m-%d'), # Optionally pass today's date as JSON
        }, safe=False)

    return render(
        request,
        "transactions/index.html",  # New template for index page
        {
            "transactions": transactions,
            "total": total,
            "category_totals": category_totals,
            "today": today, # Pass today's date to the template context
        },
    )

def new_transaction(request):
    """
    View for handling new transaction creation via GET (display form) and POST (process form).
    For AJAX POST requests, returns JSON with the new transaction and updated chart data.
    """
    today = date.today() # Get today's date

    if request.method == "POST":
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            try:
                data = json.loads(request.body.decode('utf-8')) # Decode the byte string
                # Create a QueryDict to simulate request.POST
                query_dict = QueryDict('', mutable=True)
                query_dict.update(data)
                form = TransactionForm(query_dict)
                if form.is_valid():
                    transaction = form.save()
                    total = get_total_amount()
                    category_totals = get_category_totals()
                    return JsonResponse({
                        "id": transaction.id,
                        "category": transaction.category,
                        "amount": transaction.amount,
                        "date": transaction.date.strftime("%Y-%m-%d"),
                        "total": total,
                        "category_totals": category_totals,
                    }, status=200)
                else:
                    return JsonResponse({"errors": form.errors}, status=400)
            except json.JSONDecodeError:
                return JsonResponse({"error": "Invalid JSON"}, status=400)
        else:
            form = TransactionForm(request.POST)
            if form.is_valid():
                form.save()
                return HttpResponseRedirect(request.path)
            else:
                return render(
                    request,
                    "transactions/new-transaction.html",
                    {"form": form, "today": today},
                )
    else:
        form = TransactionForm()

    transactions = Transaction.objects.all()
    total = get_total_amount()
    category_totals = get_category_totals()

    return render(
        request,
        "transactions/new-transaction.html",
        {
            "form": form,
            "transactions": transactions,
            "total": total,
            "category_totals": category_totals,
            "today": today, # Pass today's date to the template context
        },
    )

@require_http_methods(["DELETE"])
def delete_transaction(request, transaction_id):
    """
    Deletes a transaction with the given ID and returns updated total amount as JSON.
    Note: The updated chart data should be fetched separately.
    """
    transaction = get_object_or_404(Transaction, id=transaction_id)
    transaction.delete()
    total = get_total_amount()
    return JsonResponse({"success": True, "total": total})

@require_http_methods(["PUT"])
def edit_transaction(request, transaction_id):
    """
    Edits an existing transaction. Expects JSON data.
    Returns updated transaction info and refreshed chart data as JSON.
    """
    transaction = get_object_or_404(Transaction, id=transaction_id)
    data = json.loads(request.body)

    # Use the existing date if not provided
    if "date" not in data:
        data["date"] = transaction.date.strftime("%Y-%m-%d")

    form = TransactionForm(data, instance=transaction)
    if form.is_valid():
        form.save()
        total = get_total_amount()
        category_totals = get_category_totals()
        return JsonResponse({
            "success": True,
            "category": form.cleaned_data["category"],
            "amount": form.cleaned_data["amount"],
            "date": form.cleaned_data["date"].strftime("%Y-%m-%d"),
            "total": total,
            "category_totals": category_totals,
        })
    else:
        return JsonResponse({"errors": form.errors}, status=400)
