from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time
import os
import subprocess
from subprocess import PIPE
from getDriver import initServer, initDriverHeadless, initDriverWithGUI
from testHome import testHome
from testRoomEntry import testRoomEntry, testPrompt, sendChat

initServer()

def test():
    driver1 = initDriverWithGUI()
    time.sleep(2)
    testHome(driver1)
    time.sleep(1)
    testRoomEntry(driver1, "真夏のサンタクロース")
    time.sleep(1)
    sendChat(driver1, "私は貝になりたい")
    time.sleep(1)

    driver2 = initDriverWithGUI()
    roomUrl = driver1.current_url
    driver2.get(roomUrl)
    
    time.sleep(2)
    testRoomEntry(driver2, "フロントダブルバイセップス")
    time.sleep(3)
    sendChat(driver2, "筋肉いえ〜い")
    time.sleep(5)
    sendChat(driver1, "ホゲホゲウェエボボエええ！#$%&？？?")
    time.sleep(1)
    sendChat(driver1, "ホゲ！#$%&？？?")
    time.sleep(1)
    sendChat(driver1, "ホゲ！#$%&？？?")
    time.sleep(3)
    sendChat(driver1, "ホゲ！#$%&？？?")
    time.sleep(6)
    driver1.quit()

    # みやすさのためにちょっと待ってから終了する
    time.sleep(10)
    driver2.quit()
    time.sleep(3)
    # exit()

test()
exit()
