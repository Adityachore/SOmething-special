import httpx
import sys
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_invitation_details():
    print("--- Starting Onboarding & Expanded Invitation Verification ---")
    
    with httpx.Client(timeout=30.0) as client:
        # 1. Login as HR Manager
        print("\n1. Logging in as HR Manager...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": "hr@demo.com",
            "password": "Hr@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: HR Login failed: {r.status_code}, {r.text}")
            sys.exit(1)
        hr_token = r.json()["access_token"]
        hr_headers = {"Authorization": f"Bearer {hr_token}"}
        print("   HR logged in successfully.")

        # Get a department ID to use
        print("\nFetching departments...")
        r = client.get(f"{BASE_URL}/org/departments", headers=hr_headers)
        if r.status_code != 200:
            print(f"FAILED to fetch departments: {r.text}")
            sys.exit(1)
        depts = r.json()
        if not depts:
            print("FAILED: No departments found to associate with employee.")
            sys.exit(1)
        target_dept = depts[0]
        print(f"   Using department: {target_dept['name']} ({target_dept['id']})")

        # 2. Invite a new member with full pre-onboarding details
        ts = int(time.time())
        email = f"invited_emp_{ts}@demo.com"
        name = "Charlie Davis Test"
        employee_id = f"EMP_INV_{ts}"
        designation = "Lead Designer"
        phone = "+91 98765 43210"
        doj = "2026-06-01T00:00:00Z"
        
        print(f"\n2. Inviting employee: {email} with full details...")
        invite_payload = {
            "email": email,
            "role": "EMPLOYEE",
            "department_id": target_dept["id"],
            "name": name,
            "employee_id": employee_id,
            "designation": designation,
            "phone": phone,
            "date_of_joining": doj
        }
        r = client.post(f"{BASE_URL}/org/invitations/invite", json=invite_payload, headers=hr_headers)
        if r.status_code != 201:
            print(f"FAILED: Invitation creation failed: {r.status_code}, {r.text}")
            sys.exit(1)
        
        inv_data = r.json()
        token = inv_data["token"]
        print(f"   Invitation created successfully! Token: {token}")
        print(f"   Name in invitation: {inv_data.get('name')}")
        print(f"   Emp ID in invitation: {inv_data.get('employee_id')}")
        print(f"   Designation in invitation: {inv_data.get('designation')}")
        print(f"   Phone in invitation: {inv_data.get('phone')}")

        # 3. Accept the invitation
        print("\n3. Accepting the invitation (setting password)...")
        accept_payload = {
            "token": token,
            "password": "Password@123"
        }
        r = client.post(f"{BASE_URL}/public/invitations/accept", json=accept_payload)
        if r.status_code != 200:
            print(f"FAILED: Invitation accept failed: {r.status_code}, {r.text}")
            sys.exit(1)
        
        auth_data = r.json()
        emp_token = auth_data["access_token"]
        emp_uuid = auth_data["user_id"]
        print(f"   Invitation accepted successfully! Employee UUID: {emp_uuid}")

        # 4. Fetch the employee profile and verify pre-onboarding fields
        print("\n4. Verifying employee profile details in database...")
        r = client.get(f"{BASE_URL}/employees/{emp_uuid}", headers=hr_headers)
        if r.status_code != 200:
            print(f"FAILED: Fetching employee details failed: {r.status_code}, {r.text}")
            sys.exit(1)
        
        user_data = r.json()
        print(f"   Database Name: {user_data.get('name')}")
        print(f"   Database Emp ID: {user_data.get('employee_id')}")
        print(f"   Database Designation: {user_data.get('designation')}")
        print(f"   Database Phone: {user_data.get('phone')}")
        print(f"   Database Joined Date: {user_data.get('date_of_joining')}")

        # Assertions
        assert user_data.get("name") == name, f"Name mismatch: expected {name}, got {user_data.get('name')}"
        assert user_data.get("employee_id") == employee_id, f"Emp ID mismatch: expected {employee_id}, got {user_data.get('employee_id')}"
        assert user_data.get("designation") == designation, f"Designation mismatch: expected {designation}, got {user_data.get('designation')}"
        assert user_data.get("phone") == phone, f"Phone mismatch: expected {phone}, got {user_data.get('phone')}"
        assert user_data.get("status") == "Active", f"Status mismatch: expected Active, got {user_data.get('status')}"
        
        print("\n--- All tests passed! Onboarding details correctly mapped to User. ---")

if __name__ == "__main__":
    test_invitation_details()
