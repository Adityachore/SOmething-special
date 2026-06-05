import httpx
import sys
import io

BASE_URL = "http://localhost:8000/api/v1"

def test_employee_management():
    print("--- Starting Employee Management & Profile API Verification ---")
    
    with httpx.Client(timeout=30.0) as client:
        # 1. Login as HR Manager
        print("\n1. Logging in as HR Manager...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": "hr@demo.com",
            "password": "Hr@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: HR Login returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        hr_token = r.json()["access_token"]
        hr_headers = {"Authorization": f"Bearer {hr_token}"}
        print("   HR logged in successfully.")

        # 2. Add a single employee
        print("\n2. Creating a test employee...")
        import time
        ts = int(time.time())
        emp_email = f"emptest_{ts}@demo.com"
        emp_id = f"EMP_TEST_{ts}"
        emp_pwd = "Emp@1234Single"
        payload = {
            "employee_id": emp_id,
            "name": "Employee Test Single",
            "email": emp_email,
            "password": emp_pwd,
            "role": "EMPLOYEE",
            "department": "Engineering",
            "designation": "QA Engineer",
            "phone": "1234567890",
            "date_of_joining": "2026-06-01T00:00:00Z"
        }
        r = client.post(f"{BASE_URL}/employees", json=payload, headers=hr_headers)
        if r.status_code != 201:
            print(f"FAILED: Single employee creation returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        
        emp_data = r.json()
        emp_uuid = emp_data["id"]
        print(f"   Success! Created employee UUID: {emp_uuid}")

        # 3. Test duplicates validation
        print("\n3. Testing duplicate email and ID validations...")
        # A. Duplicate email
        payload["employee_id"] = "EMP_TEST_DIFF"
        r = client.post(f"{BASE_URL}/employees", json=payload, headers=hr_headers)
        print(f"   Duplicate Email Status: {r.status_code}, details: {r.json().get('detail')}")
        if r.status_code != 409:
            print("   FAILED: Duplicate email check failed to block request!")
            sys.exit(1)

        # B. Duplicate employee_id
        payload["email"] = f"empdiff_{ts}@demo.com"
        payload["employee_id"] = emp_id
        r = client.post(f"{BASE_URL}/employees", json=payload, headers=hr_headers)
        print(f"   Duplicate Employee ID Status: {r.status_code}, details: {r.json().get('detail')}")
        if r.status_code != 409:
            print("   FAILED: Duplicate Employee ID check failed to block request!")
            sys.exit(1)
        print("   Success! Duplicate validations working correctly.")

        # 4. Get employee details
        print("\n4. Retrieving employee details...")
        r = client.get(f"{BASE_URL}/employees/{emp_uuid}", headers=hr_headers)
        if r.status_code != 200:
            print(f"   FAILED: Retrieve returned status {r.status_code}")
            sys.exit(1)
        emp_details = r.json()
        print(f"   Retrieved designation: {emp_details.get('designation')}")
        print(f"   Retrieved phone: {emp_details.get('phone')}")

        # 5. Update employee
        print("\n5. Updating employee phone number...")
        update_payload = {
            "phone": "9876543210"
        }
        r = client.put(f"{BASE_URL}/employees/{emp_uuid}", json=update_payload, headers=hr_headers)
        if r.status_code != 200:
            print(f"   FAILED: Update returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        print(f"   Success! Updated phone: {r.json().get('phone')}")

        # 6. Log in as employee and submit profile update request
        print("\n6. Logging in as employee to submit correction request...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": emp_email,
            "password": emp_pwd
        })
        if r.status_code != 200:
            print(f"   FAILED: Employee login returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        emp_token = r.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        
        # Raise correction request
        req_payload = {
            "field": "designation",
            "new_value": "Senior QA Engineer",
            "reason": "Promotion/correction"
        }
        r = client.post(f"{BASE_URL}/profile-update-request", json=req_payload, headers=emp_headers)
        if r.status_code != 200:
            print(f"   FAILED: Profile update request returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        req_id = r.json()["id"]
        print(f"   Success! Correction request created ID: {req_id}, status: {r.json().get('status')}")

        # 7. HR approves the update request
        print("\n7. Reviewing and approving profile request as HR...")
        r = client.post(f"{BASE_URL}/profile-update-requests/{req_id}/review", json={
            "status": "Approved",
            "review_notes": "Looks good."
        }, headers=hr_headers)
        if r.status_code != 200:
            print(f"   FAILED: Review profile request returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        print(f"   Success! Request status now: {r.json().get('status')}")
        
        # Verify employee designation updated
        r = client.get(f"{BASE_URL}/employees/{emp_uuid}", headers=hr_headers)
        print(f"   Employee updated designation in database: {r.json().get('designation')}")
        if r.json().get("designation") != "Senior QA Engineer":
            print("   FAILED: Designation was not applied after approval!")
            sys.exit(1)

        # 8. Deactivate employee
        print("\n8. Deactivating employee as HR...")
        r = client.patch(f"{BASE_URL}/employees/{emp_uuid}/deactivate", headers=hr_headers)
        if r.status_code != 200:
            print(f"   FAILED: Deactivation returned status {r.status_code}")
            sys.exit(1)
        print(f"   Employee status in DB: {r.json().get('status')}")
        
        # 9. Verify login blocked
        print("\n9. Verifying login blockage for deactivated employee...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": emp_email,
            "password": emp_pwd
        })
        print(f"   Deactivated Login status code: {r.status_code}, body: {r.text}")
        if r.status_code != 401 or "disabled" not in r.json().get("detail", "").lower():
            print("   FAILED: Deactivated user was allowed to log in or returned wrong error!")
            sys.exit(1)
        print("   Success! Deactivated user blocked from logging in.")

        # 10. Reactivate employee
        print("\n10. Reactivating employee as HR...")
        r = client.patch(f"{BASE_URL}/employees/{emp_uuid}/deactivate", headers=hr_headers)
        if r.status_code != 200:
            print(f"   FAILED: Reactivation returned status {r.status_code}")
            sys.exit(1)
        print(f"   Employee status in DB: {r.json().get('status')}")

        # Verify login allowed
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": emp_email,
            "password": emp_pwd
        })
        if r.status_code != 200:
            print(f"   FAILED: Reactivated employee login failed with status {r.status_code}")
            sys.exit(1)
        print("   Success! Reactivated employee logged in successfully.")

        # 11. Test Export API
        print("\n11. Exporting employee list as CSV...")
        r = client.get(f"{BASE_URL}/employees/export", headers=hr_headers)
        if r.status_code != 200:
            print(f"   FAILED: Export returned status {r.status_code}")
            sys.exit(1)
        csv_data = r.text
        print("   Export returned CSV columns:")
        print(f"   {csv_data.splitlines()[0] if csv_data.splitlines() else 'EMPTY'}")
        if "Employee ID" not in csv_data:
            print("   FAILED: Export file missing expected headers!")
            sys.exit(1)
        print("   Success! Export CSV validated.")

        # 12. Test Bulk Import API
        print("\n12. Testing Bulk Upload CSV parser...")
        csv_import = (
            "Employee ID,Name,Email,Department,Designation,Phone,Role,Date of Joining\n"
            f"EMP_BULK_{ts},Bulk Worker One,bulk_{ts}@demo.com,IT,Developer,+91 99988 77766,EMPLOYEE,2026-05-15\n"
            f"{emp_id},Employee Test Single Updated,{emp_email},Engineering,Lead QA Engineer,9876543210,EMPLOYEE,2026-06-01\n"
        )
        files = {"file": ("employees.csv", io.BytesIO(csv_import.encode("utf-8")), "text/csv")}
        r = client.post(f"{BASE_URL}/employees/bulk-upload", files=files, headers=hr_headers)
        if r.status_code != 200:
            print(f"   FAILED: Bulk upload returned status {r.status_code}, body: {r.text}")
            sys.exit(1)
        
        summary = r.json()
        print(f"   Bulk upload summary: Added={summary.get('added')}, Updated={summary.get('updated')}, Failed={summary.get('failed')}")
        if summary.get('added') != 1 or summary.get('updated') != 1 or summary.get('failed') != 0:
            print("   FAILED: Unexpected counts in bulk upload summary!")
            sys.exit(1)
            
        # Clean up database: deactivated test users
        client.patch(f"{BASE_URL}/employees/{emp_uuid}/deactivate", headers=hr_headers)
        
        # Verify bulk update
        r = client.get(f"{BASE_URL}/employees/{emp_uuid}", headers=hr_headers)
        if r.json().get("name") != "Employee Test Single Updated" or r.json().get("designation") != "Lead QA Engineer":
            print("   FAILED: Bulk update values were not applied!")
            sys.exit(1)
        print("   Success! Bulk upload updates applied correctly.")

    print("\n--- All Employee Management APIs verified successfully! ---")

if __name__ == "__main__":
    test_employee_management()
