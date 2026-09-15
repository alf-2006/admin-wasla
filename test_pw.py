
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        errors = []
        page.on("pageerror", lambda exc: errors.append(f"PAGE ERROR: {exc}"))
        
        url = "file:///C:/Users/aboha/Desktop/adminstrationsystem/index.html"
        await page.goto(url)
        await page.wait_for_timeout(500)
        
        # Test Login
        try:
            await page.click('#login-submit-btn')
            await page.wait_for_timeout(500)
        except Exception as e:
            errors.append(f"Login failed: {e}")
            
        print("Playwright Errors:")
        for e in errors: print(e)
        if not errors: print("No runtime errors during login.")
        
        await browser.close()

asyncio.run(run())
