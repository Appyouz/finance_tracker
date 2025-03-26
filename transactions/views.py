import json
from django.db.models import Sum
from django.http import JsonResponse, HttpResponseRedirect, QueryDict
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from transactions.forms import TransactionForm
from .models import Transaction
from django.db.models import Sum
from datetime import date

def get_category_totals(user):
    return list(
        Transaction.objects.filter(user=user)
        .values('category')
        .annotate(total=Sum('amount'))
        .order_by('category')
    )

def get_total_amount(user):
    total = Transaction.objects.filter(user=user).aggregate(total=Sum("amount"))["total"]
    return total or 0

@login_required
def index(request):
    transactions = Transaction.objects.filter(user=request.user)
    total = get_total_amount(request.user)
    category_totals = get_category_totals(request.user)
    today = date.today()

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'transactions': list(transactions.values()),
            'category_totals': category_totals,
            'today': today.strftime('%Y-%m-%d'),
        }, safe=False)

    return render(
        request,
        "transactions/index.html",
        {
            "transactions": transactions,
            "total": total,
            "category_totals": category_totals,
            "today": today,
        },
    )

@login_required
def new_transaction(request):
    today = date.today()

    if request.method == "POST":
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            try:
                data = json.loads(request.body.decode('utf-8'))
                query_dict = QueryDict('', mutable=True)
                query_dict.update(data)
                form = TransactionForm(query_dict)
                if form.is_valid():
                    transaction = form.save(commit=False)
                    transaction.user = request.user
                    transaction.save()
                    total = get_total_amount(request.user)
                    category_totals = get_category_totals(request.user)
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
                transaction = form.save(commit=False)
                transaction.user = request.user
                transaction.save()
                return HttpResponseRedirect(request.path)
            else:
                return render(
                    request,
                    "transactions/new-transaction.html",
                    {"form": form, "today": today},
                )
    else:
        form = TransactionForm()

    transactions = Transaction.objects.filter(user=request.user)
    total = get_total_amount(request.user)
    category_totals = get_category_totals(request.user)

    return render(
        request,
        "transactions/new-transaction.html",
        {
            "form": form,
            "transactions": transactions,
            "total": total,
            "category_totals": category_totals,
            "today": today,
        },
    )

@require_http_methods(["DELETE"])
@login_required
def delete_transaction(request, transaction_id):
    transaction = get_object_or_404(Transaction, id=transaction_id, user=request.user)
    transaction.delete()
    total = get_total_amount(request.user)
    return JsonResponse({"success": True, "total": total})

@require_http_methods(["PUT"])
@login_required
def edit_transaction(request, transaction_id):
    transaction = get_object_or_404(Transaction, id=transaction_id, user=request.user)
    data = json.loads(request.body)

    if "date" not in data:
        data["date"] = transaction.date.strftime("%Y-%m-%d")

    form = TransactionForm(data, instance=transaction)
    if form.is_valid():
        form.save()
        total = get_total_amount(request.user)
        category_totals = get_category_totals(request.user)
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
