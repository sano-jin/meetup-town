from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.common.by import By
import time
import os
import subprocess
from subprocess import PIPE


def initServer():
    # compile and start the server
    proc = subprocess.run("npm run build", cwd=r"./", shell=True)
    proc = subprocess.Popen("npm run start", cwd=r"./", shell=True)

    # wait untill started
    time.sleep(3)
    

def initDriverWithGUI():
    """
    chrome のブラウザを実際に GUI で立ち上げてテストする．
    事前に webdriver をダウンロードしてカレントディレクトリにバイナリを解凍しておく必要がある．
    """
    # Webdriver定義 (各自DLして入手する必要あり)
    driver = webdriver.Chrome("./chromedriver")    
    driver.get("http://localhost:8000")

    # 明示的待機 30秒
    wait = WebDriverWait(driver, 30)
    return driver


def initDriverHeadless():
    """
    chrome のブラウザを Headless で立ち上げてテストする．
    docker run -d -p 4444:4444 -v /dev/shm:/dev/shm selenium/standalone-chrome:3.141.59-xenon
    事前に上記コマンドを実行し，Docker のコンテナを起動しておく必要がある．
    """
    # Chrome のオプションを設定する
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')

    # Selenium Server に接続する
    driver = webdriver.Remote(
        command_executor='http://localhost:4444/wd/hub',
        desired_capabilities=options.to_capabilities(),
        options=options,
    )
    driver.get("http://localhost:8000")
    return driver



