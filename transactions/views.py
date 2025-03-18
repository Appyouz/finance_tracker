from django.db.models import Sum
from django.shortcuts import redirect, render, get_object_or_404
from django.http import Http404, HttpResponse
from django.template import context, loader

from transactions.forms import TransactionForm
from .models import Transaction


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


def list_transactions(request,):
    transactions = Transaction.objects.all()
    total = transactions.aggregate(total=Sum('amount'))['total']
    context  = {
        'transactions': transactions,
        'total': total or 0           # Handles empty database case
    }
    return render(request, "transactions/list-transaction.html", context)

def new_transactions(request):
    if request.method == 'POST':
        form = TransactionForm(request.POST)
        if form.is_valid():
            form.save()  # <-- ADD THIS LINE
            return redirect('transactions:list_transactions')
    else: 
        # Show empty form for GET requests
        form = TransactionForm()

    return render(request, 'transactions/new-transaction.html', {'form': form})


def total_transactions(request ):
    return HttpResponse("Total results")
