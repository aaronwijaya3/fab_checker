import requests
from bs4 import BeautifulSoup

url = 'https://fab-digital.myrepublic.net.id/fabdigitallg?sales_id=6222373&request_custom_id=2026091506480'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}
s = requests.Session()
r = s.get(url, headers=headers, timeout=15)
soup = BeautifulSoup(r.text, 'html.parser')

scripts = [s_tag['src'] for s_tag in soup.find_all('script', src=True)]
print("Checking scripts:")
for src in scripts:
    full_url = src if src.startswith('http') else 'https://fab-digital.myrepublic.net.id/' + src.lstrip('/')
    try:
        r_js = s.get(full_url, headers=headers, timeout=10)
        if 'kt_login_signin' in r_js.text:
            print("FOUND IN:", src)
    except Exception as e:
        pass
