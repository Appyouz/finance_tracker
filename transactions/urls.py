from django.urls import path
from . import views

app_name = "transactions"
urlpatterns = [
    path("", views.index, name="index"),

    # path('', include('transactions.urls', namespace='transactions')),
    path(
        "list/",
        views.list_transactions,
        name="list_transactions",
    ),
    path("new/", views.new_transactions, name="new_transactions"),
    path('<int:transaction_id>/delete/', views.delete_transaction, name='delete-transaction'),
]
