
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # iPhone 12 Pro (Mobile Profile)
        iphone_12 = p.devices['iPhone 12 Pro']
        
        browser = await p.chromium.launch()
        context = await browser.new_context(**iphone_12)
        page = await context.new_page()
        
        url = "file:///C:/Users/aboha/Desktop/adminstrationsystem/index.html"
        await page.goto(url)
        await page.wait_for_timeout(1000)
        
        # Take a screenshot of the login screen mobile view
        await page.screenshot(path="C:/Users/aboha/Desktop/adminstrationsystem/mobile_login.png")
        
        # Login
        await page.click('#login-submit-btn')
        await page.wait_for_timeout(1000)
        
        # Take screenshot of Dashboard mobile view
        await page.screenshot(path="C:/Users/aboha/Desktop/adminstrationsystem/mobile_dash.png")
        
        # Open Menu and navigate to tasks
        try:
             await page.click('.menu-toggle')
             await page.wait_for_timeout(500)
             await page.click('li[data-page="tasks"]')
             await page.wait_for_timeout(1000)
             await page.screenshot(path="C:/Users/aboha/Desktop/adminstrationsystem/mobile_tasks.png")
             
             # Navigate to Members to check buttons
             await page.click('.menu-toggle')
             await page.wait_for_timeout(500)
             await page.click('li[data-page="members"]')
             await page.wait_for_timeout(1000)
             await page.screenshot(path="C:/Users/aboha/Desktop/adminstrationsystem/mobile_members.png")
        except Exception as e:
             print("Error clicking:", e)

        print("Mobile screenshots captured!")
        await browser.close()

asyncio.run(run())
