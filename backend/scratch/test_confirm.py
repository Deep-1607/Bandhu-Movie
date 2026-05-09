import urllib.request, urllib.error
import tempfile
import os

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="session_id"\r\n\r\ntest_session\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="seat_ids"\r\n\r\nPLT-B-01\r\n'
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

req = urllib.request.Request(
    'https://bandhu-backend.onrender.com/api/seats/confirm-manual',
    data=body,
    headers={
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': str(len(body))
    }
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f'HTTP Error: {e.code}')
    print(e.read().decode('utf-8'))
