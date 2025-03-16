from django.shortcuts import render, get_object_or_404
from django.http import Http404, HttpResponse
from django.template import loader
from .models import Transaction


# listing transactios,addig new ones,showing totals
def index(request):
    latest_transaction_list = Transaction.objects.order_by("-date")[:5]
    context = {
        "latest_transaction_list": latest_transaction_list,
    }
    return render(request, "transactions/index.html", context)


def list_transactions(request, transaction_id):
        transaction = get_object_or_404(Transaction, pk=transaction_id)
        return render(
        request, "transactions/list-transaction.html", {"transaction": transaction}
    )


def new_transactions(request, transaction_id):
    return HttpResponse("Addding new transactions")


def total_transactions(request, transaction_id):
    return HttpResponse("Total results")
