from django.urls import path
from . import views

app_name = "transactions"
urlpatterns = [
    path("", views.index, name="index"),
    path(
        "<int:transaction_id>/list/",
        views.list_transactions,
        name="list_transactions",
    ),
    path("<int:transaction_id>/new/", views.new_transactions, name="new_transaction"),
    path(
        "<int:transaction_id>/total/", views.total_transactions, name="total_transactions"
    ),
]
