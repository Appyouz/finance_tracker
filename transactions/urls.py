from django.urls import path
from . import views

app_name = "transactions"

urlpatterns = [
    path("index/", views.index, name="index"),  # Index page with list and chart
    path("new/", views.new_transaction, name="new_transaction"),
    path(
        "<int:transaction_id>/delete/",
        views.delete_transaction,
        name="delete-transaction",
    ),
    path("<int:transaction_id>/edit/", views.edit_transaction, name="edit-transaction"),
    # Optionally, include the list view if needed separately:
    # path("list/", views.list_transactions, name="list_transactions"),
]
