from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.alert import Alert
from selenium.webdriver.common.keys import Keys
import time

def testRoomEntry(driver, userName):
    """
    部屋にちゃんと入れるかのテスト
    """
    # テキストフォームを探して，userName を書き込む
    element = driver.find_element_by_id("userName-form")
    element.send_keys(userName)

    time.sleep(2)
    
    # エンターキーを押す
    element.send_keys(Keys.ENTER)
    # send_button = driver.find_element_by_class_name("send-button-container")
    # send_button.click()


def testPrompt(driver):
    """
    カメラやマイクをオンにして良いかのプロンプトをオンにする
    どうにも機能しないのでオフ（プロンプトを表示しない設定でのみテスト可能）
    """
    # ダイアログが表示されるまで，念の為少し待つ
    time.sleep(5)
    # Accept をクリックする
    # Alert(driver).accept()

    time.sleep(5)

def sendChat(driver, chatMessage):
    """
    チャットを書き込む
    送信はしない
    """
    # テキストエリアを探して，chatMessage を書き込む
    element = driver.find_element_by_id("input-message")
    element.send_keys(chatMessage)

    time.sleep(3)
    
    # 「Send」ボタンをクリックする
    send_button = driver.find_element_by_class_name("send-button-container")
    send_button.click()
    
    


    
    
