from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.common.by import By
import time
import os
import subprocess
from subprocess import PIPE
from getDriver import initServer, initDriverHeadless, initDriverWithGUI
from testHome import testHome

initServer()
driver = initDriverWithGUI()
testHome(driver)

# みやすさのためにちょっと待ってから終了する
time.sleep(10)
driver.quit()
exit()
