from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.common.by import By
import time
import os
import subprocess
from subprocess import PIPE

proc = subprocess.run("npm run build", cwd=r"/Users/sano/Desktop/meetup-town", shell=True)
proc = subprocess.Popen("npm run start", cwd=r"/Users/sano/Desktop/meetup-town", shell=True)


time.sleep(3)

# os.system("cd /Users/sano/Desktop/meetup-town && npm run dev")


# Webdriver定義 (各自DLして入手する必要あり)
driver = webdriver.Chrome("/Users/sano/Desktop/selenium-test/chromedriver")
# driver.get("https://www.google.co.jp/")

driver.get("http://localhost:8000")



# 明示的待機 5秒
wait = WebDriverWait(driver, 15)

# 画面右上の「画像」リンクをクリックする
element = driver.find_element_by_link_text("Create a new room")
element.click()
time.sleep(10)

driver.quit()
exit()
