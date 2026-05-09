from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
now_ist = datetime.now(IST)
now_utc = datetime.now(timezone.utc)

print(f"Server Local: {datetime.now()}")
print(f"Server UTC:   {now_utc}")
print(f"Calculated IST: {now_ist}")
print(f"ISO Format:    {now_ist.isoformat()}")
