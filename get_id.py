import urllib.request, re
url = 'https://www.youtube.com/@simomi/about'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    match = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]+)"', html)
    print(match.group(1) if match else "Not Found")
except Exception as e:
    print(e)
