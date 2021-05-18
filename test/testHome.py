from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.common.by import By

def testHome(driver):
    # 「Create a new room」リンクをクリックする
    element = driver.find_element_by_link_text("Create a new room")
    element.click()
    # time.sleep(10)
