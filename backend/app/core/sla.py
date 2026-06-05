from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from app.db.models.tenant import Tenant

def calculate_business_hours_sla(start_time: datetime, sla_hours: int, tenant: Tenant) -> datetime:
    """
    Calculates the SLA due date by stepping through working hours and skipping weekends
    based on the tenant's timezone and working_hours settings.
    """
    # 1. Resolve timezone
    try:
        tz = ZoneInfo(tenant.timezone)
    except Exception:
        tz = ZoneInfo("Asia/Kolkata")
    
    # Ensure start_time has a timezone, default to UTC if naive
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=ZoneInfo("UTC"))
        
    local_dt = start_time.astimezone(tz)
    
    # 2. Resolve working hours
    working_hours_dict = tenant.working_hours
    if not working_hours_dict:
        # Default M-F 09:00 to 18:00
        working_hours_dict = {
            "monday": {"start": "09:00", "end": "18:00"},
            "tuesday": {"start": "09:00", "end": "18:00"},
            "wednesday": {"start": "09:00", "end": "18:00"},
            "thursday": {"start": "09:00", "end": "18:00"},
            "friday": {"start": "09:00", "end": "18:00"},
        }
    
    # Standardize keys to lowercase
    working_hours = {k.lower(): v for k, v in working_hours_dict.items()}
    
    def parse_time(time_str: str) -> time:
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    
    remaining_minutes = sla_hours * 60
    current_dt = local_dt
    
    # Step through time to find business minutes
    while remaining_minutes > 0:
        day_name = current_dt.strftime("%A").lower()
        
        if day_name in working_hours:
            day_schedule = working_hours[day_name]
            start_t = parse_time(day_schedule["start"])
            end_t = parse_time(day_schedule["end"])
            
            start_dt = current_dt.replace(hour=start_t.hour, minute=start_t.minute, second=0, microsecond=0)
            end_dt = current_dt.replace(hour=end_t.hour, minute=end_t.minute, second=0, microsecond=0)
            
            # If we are before start of working period, jump to start
            if current_dt < start_dt:
                current_dt = start_dt
            
            # If we are inside the working period
            if start_dt <= current_dt < end_dt:
                available_minutes = int((end_dt - current_dt).total_seconds() / 60)
                if remaining_minutes <= available_minutes:
                    current_dt = current_dt + timedelta(minutes=remaining_minutes)
                    remaining_minutes = 0
                else:
                    remaining_minutes -= available_minutes
                    current_dt = end_dt + timedelta(minutes=1)
            else:
                # We are past end of working period today, go to next day 00:00
                current_dt = (current_dt + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            # Non-working day, go to next day 00:00
            current_dt = (current_dt + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            
    # Return as UTC datetime
    return current_dt.astimezone(ZoneInfo("UTC"))
