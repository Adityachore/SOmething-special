import httpx
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_hardening():
    print("--- Starting Hardening & Clustering Verification ---")
    
    with httpx.Client(timeout=30.0) as client:
        # 1. Login as Admin
        print("\n1. Logging in as admin...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@demo.com",
            "password": "Admin@1234"
        })
        if r.status_code != 200:
            print(f"FAILED: Admin login returned status {r.status_code}")
            sys.exit(1)
        admin_token = r.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("   Admin logged in successfully.")

        # 2. Create a test employee
        print("\n2. Creating a test employee...")
        emp_email = f"emp_hard_{int(time.time())}@demo.com"
        emp_pwd = "Password@123"
        payload = {
            "employee_id": f"EMP_HARD_{int(time.time())}",
            "name": "Hardening Test Employee",
            "email": emp_email,
            "password": emp_pwd,
            "role": "EMPLOYEE",
            "department": "Engineering"
        }
        r = client.post(f"{BASE_URL}/employees", json=payload, headers=admin_headers)
        if r.status_code != 201:
            print(f"FAILED to create employee: {r.status_code}, body: {r.text}")
            sys.exit(1)
        emp_data = r.json()
        emp_id = emp_data["id"]
        print(f"   Success! Created employee UUID: {emp_id}")

        # 3. Test password edit/reset
        print("\n3. Testing password reset for employee...")
        new_pwd = "NewPassword@123"
        r = client.put(f"{BASE_URL}/employees/{emp_id}", json={
            "name": "Hardening Test Employee",
            "password": new_pwd
        }, headers=admin_headers)
        if r.status_code != 200:
            print(f"FAILED to reset password: {r.status_code}, body: {r.text}")
            sys.exit(1)
        print("   Password reset request processed.")

        # Test login with old password (should fail)
        print("   Trying login with old password...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": emp_email,
            "password": emp_pwd
        })
        if r.status_code == 200:
            print("FAILED: Old password still works after reset!")
            sys.exit(1)
        print("   Success! Old password login rejected.")

        # Test login with new password (should succeed)
        print("   Trying login with new password...")
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": emp_email,
            "password": new_pwd
        })
        if r.status_code != 200:
            print(f"FAILED: New password login failed with status {r.status_code}")
            sys.exit(1)
        emp_token = r.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        print("   Success! Logged in with new password.")

        # 4. Test Deactivation Login Message
        print("\n4. Testing deactivation login warning...")
        r = client.patch(f"{BASE_URL}/employees/{emp_id}/deactivate", headers=admin_headers)
        if r.status_code != 200:
            print(f"FAILED to deactivate user: {r.status_code}")
            sys.exit(1)
        print("   User status set to Inactive.")

        # Attempt login
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": emp_email,
            "password": new_pwd
        })
        print(f"   Login status: {r.status_code}, body: {r.text}")
        resp_json = r.json()
        error_msg = resp_json.get("message", "") or resp_json.get("detail", "")
        if r.status_code != 401 or "disabled" not in error_msg.lower():
            print("FAILED: Did not receive expected disabled account message!")
            sys.exit(1)
        print("   Success! Received account disabled warning message.")

        # Reactivate user for further tests
        client.patch(f"{BASE_URL}/employees/{emp_id}/deactivate", headers=admin_headers)
        print("   User reactivated.")

        # 5. Test Rate Limiting (max 5/hour)
        print("\n5. Testing rate limiting...")
        # Login again to get active session
        r = client.post(f"{BASE_URL}/auth/login", json={
            "email": emp_email,
            "password": new_pwd
        })
        emp_token = r.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}

        print("   Submitting 5 complaints...")
        submitted_ids = []
        for i in range(5):
            r = client.post(f"{BASE_URL}/complaints", json={
                "title": f"Rate limit complaint {i}",
                "description": f"This is complaint number {i} submitted to test the rate limit of 5 complaints per hour."
            }, headers=emp_headers)
            if r.status_code not in [200, 201]:
                print(f"FAILED on complaint {i}: status {r.status_code}, body: {r.text}")
                sys.exit(1)
            submitted_ids.append(r.json()["id"])
        print("   Successfully submitted 5 complaints. Submitting 6th complaint (should fail)...")
        r = client.post(f"{BASE_URL}/complaints", json={
            "title": "Rate limit complaint 6",
            "description": "This is complaint number 6 and it should be blocked by rate limit check."
        }, headers=emp_headers)
        print(f"   Status code: {r.status_code}, body: {r.text}")
        if r.status_code != 429:
            print("FAILED: 6th complaint was not rate limited!")
            sys.exit(1)
        print("   Success! 6th complaint was rate limited with 429 Too Many Requests.")

        # 6. Test Similarity Clustering & Value Assessment
        print("\n6. Testing similarity clustering and value assessment...")
        # Create another employee to submit similarity test complaints
        emp_email2 = f"emp_hard2_{int(time.time())}@demo.com"
        r = client.post(f"{BASE_URL}/employees", json={
            "employee_id": f"EMP_HARD2_{int(time.time())}",
            "name": "Similarity Test Employee",
            "email": emp_email2,
            "password": emp_pwd,
            "role": "EMPLOYEE",
            "department": "Engineering"
        }, headers=admin_headers)
        emp_token2 = client.post(f"{BASE_URL}/auth/login", json={
            "email": emp_email2,
            "password": emp_pwd
        }).json()["access_token"]
        emp_headers2 = {"Authorization": f"Bearer {emp_token2}"}

        # Submit Complaint A (Unique)
        print("   Submitting unique complaint A...")
        r = client.post(f"{BASE_URL}/complaints", json={
            "title": "The server room temperature is too cold",
            "description": "The temperature in the server room is extremely low and makes the room uncomfortable to work in."
        }, headers=emp_headers2)
        comp_a_id = r.json()["id"]

        # Wait for Complaint A to finish processing
        print("   Waiting for Complaint A to finish processing...")
        for _ in range(30):
            r = client.get(f"{BASE_URL}/complaints/{comp_a_id}", headers=admin_headers)
            if r.status_code == 200 and r.json().get("primary_department") is not None:
                break
            time.sleep(1)

        # Submit Complaint B (Gibberish - Not Valuable)
        print("   Submitting gibberish complaint B...")
        r = client.post(f"{BASE_URL}/complaints", json={
            "title": "xyz",
            "description": "abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc"
        }, headers=emp_headers2)
        comp_b_id = r.json()["id"]

        # Wait for Complaint B to finish processing
        print("   Waiting for Complaint B to finish processing...")
        for _ in range(30):
            r = client.get(f"{BASE_URL}/complaints/{comp_b_id}", headers=admin_headers)
            if r.status_code == 200 and r.json().get("primary_department") is not None:
                break
            time.sleep(1)

        # Submit Complaint C (Similar to A)
        print("   Submitting similar complaint C...")
        r = client.post(f"{BASE_URL}/complaints", json={
            "title": "Server room cooling is freezing",
            "description": "The server room is freezing cold, the AC is set way too low and needs adjustment."
        }, headers=emp_headers2)
        comp_c_id = r.json()["id"]

        # Wait for AI processing
        print("   Waiting 20 seconds for Celery workers to process AI analysis...")
        time.sleep(20)

        # Check A details
        r = client.get(f"{BASE_URL}/complaints/{comp_a_id}", headers=admin_headers)
        ca = r.json()
        print(f"   Complaint A (Unique) Details:")
        print(f"     is_valuable: {ca.get('is_valuable')}")
        print(f"     is_repeated: {ca.get('is_repeated')}")
        print(f"     cluster_id: {ca.get('cluster_id')}")

        # Check B details (Gibberish)
        r = client.get(f"{BASE_URL}/complaints/{comp_b_id}", headers=admin_headers)
        cb = r.json()
        print(f"   Complaint B (Gibberish) Details:")
        print(f"     is_valuable: {cb.get('is_valuable')}")
        print(f"     ai_value_reason: {cb.get('ai_value_reason')}")

        # Check C details (Repeated)
        r = client.get(f"{BASE_URL}/complaints/{comp_c_id}", headers=admin_headers)
        cc = r.json()
        print(f"   Complaint C (Similar to A) Details:")
        print(f"     is_valuable: {cc.get('is_valuable')}")
        print(f"     is_repeated: {cc.get('is_repeated')}")
        print(f"     cluster_id: {cc.get('cluster_id')}")
        print(f"     similarity_score: {cc.get('similarity_score')}")
        print(f"     repeat_count_at_assignment: {cc.get('repeat_count_at_assignment')}")

        # Verify cluster_id match between A and C
        if cc.get("is_repeated") and cc.get("cluster_id") is not None:
            # Refresh complaint A details to check if its cluster_id got populated when C matched
            r = client.get(f"{BASE_URL}/complaints/{comp_a_id}", headers=admin_headers)
            ca = r.json()
            if ca.get("cluster_id") == cc.get("cluster_id"):
                print("   Success! Complaints A and C are grouped in the same cluster.")
            else:
                print(f"   WARNING: Cluster ID mismatch! A: {ca.get('cluster_id')}, C: {cc.get('cluster_id')}")
        else:
            print("   WARNING: Similarity matching did not cluster C with A.")

        print("\n--- All Hardening and Clustering Verifications Completed! ---")

if __name__ == "__main__":
    test_hardening()
