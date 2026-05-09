import urllib.request, urllib.error, json

session_id = 'test_session_9999'
seat_id = 'PLT-B-02'

try:
    print("Locking seat...")
    req_lock = urllib.request.Request(
        f'https://bandhu-backend.onrender.com/api/seats/{seat_id}/select',
        data=json.dumps({'session_id': session_id}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req_lock) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f'Lock failed: {e.code}')
    print(e.read().decode('utf-8'))

print("\nConfirming booking...")
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="session_id"\r\n\r\n' + session_id + '\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="seat_ids"\r\n\r\n' + seat_id + '\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="customer_name"\r\n\r\nTest User\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="customer_phone"\r\n\r\n1234567890\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="screenshot"; filename="test.png"\r\n'
    'Content-Type: image/png\r\n\r\n'
    'fake_image_data_here\r\n'
    '--' + boundary + '--\r\n'
).encode('utf-8')

req_confirm = urllib.request.Request(
    'https://bandhu-backend.onrender.com/api/seats/confirm-manual',
    data=body,
    headers={
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': str(len(body))
    }
)

try:
    with urllib.request.urlopen(req_confirm) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f'Confirm failed: {e.code}')
    print(e.read().decode('utf-8'))
