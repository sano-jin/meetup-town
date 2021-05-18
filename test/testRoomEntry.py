from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.alert import Alert
import time

def testRoomEntry(driver, userName):
    """
    部屋にちゃんと入れるかのテスト
    """
    # テキストフォームを探して，userName を書き込む
    element = driver.find_element_by_name("username")
    element.send_keys(userName)

    time.sleep(2)
    
    # 「Create a new room」リンクをクリックする
    send_button = driver.find_element_by_class_name("send-button-container")
    send_button.click()


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

    time.sleep(2)
    
    # 「Send」ボタンをクリックする
    send_button = driver.find_element_by_class_name("send-button-container")
    send_button.click()
    
    


    
    
