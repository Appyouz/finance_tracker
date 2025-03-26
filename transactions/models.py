from django.db import models
import datetime
from django.utils import timezone
from django.contrib.auth.models import User

# Model: Transaction, field(amount, category, date)


class Transaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  
    amount = models.IntegerField()
    category = models.CharField(max_length=100)
    date = models.DateField("Date", default=timezone.now)

    def __str__(self):
        return self.category

    def was_published_recently(self):
        return self.date >= timezone.now() - datetime.timedelta(days=1)
