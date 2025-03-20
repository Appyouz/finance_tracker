import json
from django.db.models import Sum
from django.http import JsonResponse, HttpResponseRedirect
from django.shortcuts import redirect, render, get_object_or_404
from transactions.forms import TransactionForm
from .models import Transaction
from django.views.decorators.http import require_http_methods


# listing transactios,addig new ones,showing totals
def index(request):
    latest_transaction_list = Transaction.objects.order_by("-date")[:5]
    context = {
        "latest_transaction_list": latest_transaction_list,
    }
    return render(request, "transactions/index.html", context)


# def detail_list_transactions(request, transaction_id):
#         transaction = get_object_or_404(Transaction, pk=transaction_id)
#         return render(
#         request, "transactions/list-transaction.html", {"transaction": transaction}
#     )


def list_transactions(
    request,
):
    transactions = Transaction.objects.all()
    total = transactions.aggregate(total=Sum("amount"))["total"]
    context = {
        "transactions": transactions,
        "total": total or 0,  # Handles empty database case
    }
    return render(request, "transactions/list-transaction.html", context)


def new_transactions(request):
    if request.method == "POST":
        form = TransactionForm(request.POST)
        if form.is_valid():
            transaction = form.save()
            total = Transaction.objects.aggregate(total=Sum("amount"))["total"] or 0
            if request.headers.get("X-Requested-with") == "XMLHttpRequest":
                return JsonResponse(
                    {
                        "id": transaction.id,
                        "category": transaction.category,
                        "amount": transaction.amount,
                        "date": transaction.date.strftime("%Y-%m-%d"),  # format date
                        "total": total,
                    },
                    status=200,
                )
            else:
                # Non-AJAX (fallback for browsers without JS)
                # Redirect to the same page
                return HttpResponseRedirect(request.path)

        # Handling Form errors like missing amount etc
        else:
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                # Show empty form for GET requests
                return JsonResponse({"errors": form.errors}, status=400)
            else:
                # Handle Non-AJAX form errors
                return render(
                    request, "transactions/new-transaction.html", {"form": form}
                )

    # For GET requests, show the form and list
    transactions = Transaction.objects.all()
    form = TransactionForm()

    total = transactions.aggregate(total=Sum("amount"))["total"]
    return render(
        request,
        "transactions/new-transaction.html",
        {
            "form": form,
            "transactions": transactions,
            "total": total or 0,
        },
    )


@require_http_methods(["DELETE"])
def delete_transaction(request, transaction_id):
    transaction = get_object_or_404(Transaction, id=transaction_id)
    transaction.delete()

    # Recalculate the total after deletion
    total = Transaction.objects.aggregate(total=Sum("amount"))["total"] or 0

    return JsonResponse({"success": True, "total": total})

@require_http_methods(["PUT"])
def edit_transaction(request, transaction_id):
    transaction = get_object_or_404(Transaction, id=transaction_id)
    data = json.loads(request.body)
    
    # Set default date to transaction's existing date if missing
    if 'date' not in data:
        data['date'] = transaction.date.strftime("%Y-%m-%d")
    
    form = TransactionForm(data, instance=transaction)
    if form.is_valid():
        form.save()
        total = Transaction.objects.aggregate(total=Sum('amount'))['total'] or 0
        return JsonResponse({
            'success': True,
            'category': form.cleaned_data['category'],
            'amount': form.cleaned_data['amount'],
            'date': form.cleaned_data['date'].strftime("%Y-%m-%d"), 
            'total': total,
        })
    else:
        return JsonResponse({'errors': form.errors}, status=400)
