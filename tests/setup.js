const fs = require("fs");
const path = require("path");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

/* Configurations */
const config = {
    timeouts: {
        implicit: 10000,
        pageLoad: 30000,
        script: 10000,
    },
    browser: {
        headless: false,
        windowSize: {
            width: 1920,
            height: 1080,
        },
    },
    credentials: {
        email: "qmqrajaiqyqhlmsguc@nespj.com",
        password: "Test123.",
    },
    urls: {
        base: "https://www.dm-drogeriemarkt.ba/",
        product: "https://www.dm-drogeriemarkt.ba/violeta-maramice-classic-p3870128000070.html",
    },
};

/* Driver factory */
class DriverFactory {
    constructor() {
        this.driver = null;
    }

    async createDriver() {
        const options = new chrome.Options();

        if (config.browser.headless) {
            options.addArguments("--headless=new");
        }

        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--disable-gpu");
        options.addArguments(
            `--window-size=${config.browser.windowSize.width},${config.browser.windowSize.height}`
        );

        try {
            this.driver = await new Builder()
                .forBrowser("chrome")
                .setChromeOptions(options)
                .build();

            await this.driver.manage().setTimeouts({
                implicit: config.timeouts.implicit,
                pageLoad: config.timeouts.pageLoad,
                script: config.timeouts.script,
            });

            if (!config.browser.headless) {
                await this.driver.manage().window().maximize();
            }

            return this.driver;
        } catch (error) {
            console.error("Error during WebDriver creation:", error.message);
            throw error;
        }
    }

    getDriver() {
        return this.driver;
    }

    async quitDriver() {
        if (!this.driver) return;

        try {
            await this.driver.quit();
        } catch (error) {
            console.error("Error during driver closing:", error.message);
        } finally {
            this.driver = null;
        }
    }
}

const driverFactory = new DriverFactory();


let driver = null;

async function setupDriver(suiteName) {
    console.log(`Inicijalizacija ${suiteName} test suite-a...`);

    try {
        console.log("Kreiranje WebDriver instance...");
        driver = await driverFactory.createDriver();
        console.log("Setup zavrsen - Driver kreiran");
        return driver;
    } catch (error) {
        console.error("Greska u setup-u:", error.message);
        console.error(
            "Provjeri da li je Chrome instaliran i da PATH uključuje chromedriver"
        );
        throw error;
    }
}

async function teardownDriver() {
    console.log("Ciscenje resursa...");

    if (driver) {
        await driverFactory.quitDriver();
        console.log("WebDriver zatvoren");
        driver = null;
    }
}

async function waitForPageLoad() {
    if (!driver) {
        throw new Error("Driver nije inicijalizovan");
    }

    await driver.wait(async () => {
        const readyState = await driver.executeScript("return document.readyState");
        return readyState === "complete";
    }, 15000);

    await handleCookiePopupAfterPageLoad();
}


/* Automatically rejects the Usercentrics cookie consent popup after page load. */
async function handleCookiePopupAfterPageLoad() {
    if (!driver) {
        return;
    }

    try {
        // Wait 2-3 seconds for the cookie popup to appear (it loads asynchronously)
        console.log("Waiting for cookie popup to appear...");
        await driver.sleep(3000);

        // Check if usercentrics-root exists and wait for it if needed
        let shadowHost = null;
        try {
            shadowHost = await driver.wait(
                until.elementLocated(By.id("usercentrics-root")),
                5000
            );
        } catch (e) {
            // No usercentrics-root found, cookie popup won't appear
            return;
        }

        if (!shadowHost) {
            return;
        }

        // Wait a bit more for shadow root content to load
        await driver.sleep(1000);

        // This will check if popup is visible and click the deny button
        await handleCookiePopup("reject", 5000);
    } catch (e) {
    }
}

async function handleTestFailure(testContext) {
    if (!driver) {
        return;
    }

    await new Promise((resolve) => setImmediate(resolve));

    const currentTest = testContext.currentTest;
    if (currentTest?.state === "failed") {
        const testTitle = currentTest.title;
        const error = currentTest.err;

        console.error("" + "=".repeat(80));
        console.error(`TEST FAILED: ${testTitle}`);
        console.error("=".repeat(80));

        try {
            const currentUrl = await driver.getCurrentUrl().catch(() => "N/A");
            const pageTitle = await driver.getTitle().catch(() => "N/A");

            console.error(`Debugging Information:`);
            console.error(`URL: ${currentUrl}`);
            console.error(`Page Title: ${pageTitle}`);

            if (error) {
                console.error(`Error Details:`);
                console.error(`Message: ${error.message}`);
                if (error.stack) {
                    console.error(`Stack Trace:`);
                    const stackLines = error.stack.split("\n").slice(0, 10);
                    stackLines.forEach((line) => console.error(`${line}`));
                }
            }

            try {
                const screenshotsDir = path.join(__dirname, "..", "screenshots");
                if (!fs.existsSync(screenshotsDir)) {
                    fs.mkdirSync(screenshotsDir, { recursive: true });
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const safeTestName = testTitle
                    .replace(/[^a-z0-9]/gi, "_")
                    .toLowerCase();
                const screenshotPath = path.join(
                    screenshotsDir,
                    `${safeTestName}_${timestamp}.png`
                );

                const screenshot = await driver.takeScreenshot();
                fs.writeFileSync(screenshotPath, screenshot, "base64");
                console.log(`Screenshot saved: ${screenshotPath}`);
            } catch (screenshotError) {
                console.error(`Could not save screenshot: ${screenshotError.message}`);
            }
        } catch (debugError) {
            console.error(`Could not gather debugging info: ${debugError.message}`);
        }

        console.error("=".repeat(80) + "");
    }
}

/**
 * Safely handles the Usercentrics cookie consent popup by accepting or rejecting cookies via Shadow DOM.
 *
 * @param {string} action - reject od accept)
 * @param {number} maxWaitTime - Maximum time to wait for popup in milliseconds (default: 5000)
 * @returns {Promise<boolean>} - Returns true if popup was handled successfully, false otherwise
 */
async function handleCookiePopup(action = "reject", maxWaitTime = 5000) {
    if (!driver) {
        return false;
    }

    try {
        // First, check if popup is already handled or doesn't exist
        const popupCheck = await driver.executeScript(`
            const host = document.getElementById('usercentrics-root');
            if (!host) return { exists: false, visible: false };
            
            let root = host.shadowRoot;
            if (!root) {
                const template = host.querySelector('template[shadowrootmode="open"]');
                if (template) root = template.content;
            }
            
            if (!root) return { exists: true, visible: false };
            
            const overlay = root.querySelector('[data-testid="uc-overlay"]');
            const dialog = root.querySelector('[data-testid="uc-default-wall"]');
            
            if (!overlay && !dialog) {
                return { exists: true, visible: false };
            }
            
            // Check visibility
            let isVisible = false;
            if (overlay) {
                const style = window.getComputedStyle(overlay);
                isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            }
            if (!isVisible && dialog) {
                const style = window.getComputedStyle(dialog);
                isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            }
            
            return { exists: true, visible: isVisible };
        `);

        // If popup doesn't exist or isn't visible, it's already handled - that's fine
        if (!popupCheck.exists || !popupCheck.visible) {
            return false;
        }

        // Popup exists and is visible, try to handle it
        console.log(`Attempting to ${action} cookies via Shadow DOM...`);

        // Try multiple times with shorter waits (popup might be loading)
        const attempts = 3;
        const waitInterval = Math.min(maxWaitTime / attempts, 2000);

        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                // Check if shadow host exists
                const shadowHost = await driver
                    .wait(until.elementLocated(By.id("usercentrics-root")), 2000)
                    .catch(() => null);

                if (!shadowHost) {
                    if (attempt < attempts) {
                        await driver.sleep(waitInterval);
                        continue;
                    }
                    return false;
                }

                // Wait a bit for popup to render
                await driver.sleep(500);

                // Execute JS to pierce the Shadow DOM and interact with the popup
                const result = await driver.executeScript(
                    `
                    const host = arguments[0];
                    const action = arguments[1];
                    
                    // Get shadow root - handle both shadowRoot and template shadowrootmode
                    let root = host.shadowRoot;
                    
                    // If shadowRoot is null, try to get it from template
                    if (!root) {
                        const template = host.querySelector('template[shadowrootmode="open"]');
                        if (template) {
                            root = template.content;
                        }
                    }
                    
                    if (!root) {
                        return { success: false, reason: 'Shadow root not found' };
                    }
                    
                    // Check if popup is visible by looking for the overlay or dialog
                    const overlay = root.querySelector('[data-testid="uc-overlay"]');
                    const dialog = root.querySelector('[data-testid="uc-default-wall"]');
                    
                    if (!overlay && !dialog) {
                        return { success: false, reason: 'Popup not visible' };
                    }
                    
                    // Check visibility
                    let isVisible = false;
                    if (overlay) {
                        const style = window.getComputedStyle(overlay);
                        isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                    }
                    if (!isVisible && dialog) {
                        const style = window.getComputedStyle(dialog);
                        isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                    }
                    
                    if (!isVisible) {
                        return { success: false, reason: 'Popup not visible' };
                    }
                    
                    // Determine which button to click
                    const buttonSelector = action === 'accept' 
                        ? 'button[data-testid="uc-accept-all-button"]'
                        : 'button[data-testid="uc-deny-all-button"]';
                    
                    const button = root.querySelector(buttonSelector);
                    
                    if (!button) {
                        return { success: false, reason: 'Button not found' };
                    }
                    
                    // Check if button is visible and clickable
                    const style = window.getComputedStyle(button);
                    if (style.display === 'none' || style.visibility === 'hidden') {
                        return { success: false, reason: 'Button not visible' };
                    }
                    
                    // Scroll button into view if needed
                    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Small delay before click
                    setTimeout(() => {
                        button.click();
                    }, 100);
                    
                    return { success: true, action: action };
                `,
                    shadowHost,
                    action
                );

                if (result && result.success) {
                    console.log(
                        `Cookies ${action === "accept" ? "accepted" : "rejected"} successfully.`
                    );

                    // Wait for popup to close
                    await driver.sleep(1500);
                    return true;
                } else if (attempt < attempts) {
                    // Try again after a short wait
                    await driver.sleep(waitInterval);
                    continue;
                } else {
                    console.log(
                        `Cookie popup handling failed after ${attempts} attempts: ${result ? result.reason : "Unknown error"
                        }`
                    );
                    return false;
                }
            } catch (e) {
                if (attempt < attempts) {
                    await driver.sleep(waitInterval);
                    continue;
                }
                // Last attempt failed, return false (non-blocking)
                return false;
            }
        }

        return false;
    } catch (e) {
        // Never throw - popup might not be present, which is completely fine
        console.log("Cookie popup handling skipped (not present or already handled)");
        return false;
    }
}

/**
 * Helper function to perform login on DM website
 * Navigates to homepage, clicks account widget, opens flyout, clicks "Prijava", then fills in credentials
 *
 * @param {string} email - Email address for login (optional, uses config if not provided)
 * @param {string} password - Password for login (optional, uses config if not provided)
 * @returns {Promise<boolean>} - Returns true if login successful, false otherwise
 */
async function performLogin(email = null, password = null) {
    if (!driver) {
        console.error("Driver not initialized, cannot perform login");
        return false;
    }

    const loginEmail = email || config.credentials.email;
    const loginPassword = password || config.credentials.password;

    try {
        // Step 1: Navigate to homepage
        console.log("Navigating to homepage...");
        await driver.get(config.urls.base);
        await waitForPageLoad(); // Automatically handles cookie popup

        // Step 2: Find the nav container with account widget
        console.log("Looking for account widget container...");
        const widgetContainer = await driver
            .wait(until.elementLocated(By.css('nav[data-dmid="widget-container"]')), 10000)
            .catch(() => null);

        if (!widgetContainer) {
            console.error("Could not find account widget container");
            return false;
        }

        // Step 3: Find and click the account widget button
        console.log("Looking for account widget button...");
        const accountButton = await widgetContainer
            .findElement(By.css('button[data-dmid="account-widget-button"]'))
            .catch(() => null);

        if (!accountButton) {
            console.error("Could not find account widget button");
            return false;
        }

        console.log("Clicking account widget button to open flyout...");
        await driver.executeScript(
            "arguments[0].scrollIntoView({block: 'center'});",
            accountButton
        );
        await driver.sleep(500);
        await accountButton.click();
        await driver.sleep(1500);

        // Step 4: Find the flyout div and the "Prijava" button inside it
        console.log("Looking for account widget flyout...");
        const flyout = await driver
            .wait(until.elementLocated(By.css('div[data-dmid="account-widget-flyout"]')), 5000)
            .catch(() => null);

        if (!flyout) {
            console.error("Could not find account widget flyout after clicking button");
            return false;
        }

        // Step 5: Find "Prijava" button inside the flyout
        console.log("Looking for 'Prijava' button in flyout...");
        let prijavaButton = null;

        // Try multiple selectors to find Prijava button
        const prijavaSelectors = [
            By.xpath(".//button[contains(.,'Prijava')] | .//a[contains(.,'Prijava')]"),
            By.xpath(".//button[contains(.,'Login')] | .//a[contains(.,'Login')]"),
            By.css('[data-dmid*="login"]'),
            By.css('[data-dmid*="prijava"]'),
            By.css('button[href*="login"]'),
            By.css('a[href*="login"]'),
            By.css('button[href*="prijava"]'),
            By.css('a[href*="prijava"]'),
        ];

        for (const selector of prijavaSelectors) {
            try {
                const elements = await flyout.findElements(selector);
                if (elements.length > 0) {
                    for (const element of elements) {
                        const isDisplayed = await element.isDisplayed().catch(() => false);
                        if (isDisplayed) {
                            prijavaButton = element;
                            break;
                        }
                    }
                    if (prijavaButton) break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!prijavaButton) {
            console.error("Could not find 'Prijava' button in flyout");
            return false;
        }

        console.log("Clicking 'Prijava' button...");
        await driver.executeScript(
            "arguments[0].scrollIntoView({block: 'center'});",
            prijavaButton
        );
        await driver.sleep(500);
        await prijavaButton.click();

        // Wait for navigation to login page
        await driver.sleep(2000);
        await waitForPageLoad();

        // Wait for and fill email input
        console.log("Filling in email...");
        const emailInput = await driver.wait(until.elementLocated(By.id("emailAddress-input")), 10000);
        await emailInput.clear();
        await emailInput.sendKeys(loginEmail);
        await driver.sleep(500);

        // Wait for and fill password input
        console.log("Filling in password...");
        const passwordInput = await driver.wait(until.elementLocated(By.id("password-input")), 10000);
        await passwordInput.clear();
        await passwordInput.sendKeys(loginPassword);
        await driver.sleep(500);

        // Click login button
        console.log("Clicking login button...");
        const loginButton = await driver.wait(until.elementLocated(By.id("login-button")), 10000);

        await driver.executeScript(
            "arguments[0].scrollIntoView({block: 'center'});",
            loginButton
        );
        await driver.sleep(500);

        const urlBeforeLogin = await driver.getCurrentUrl();
        await loginButton.click();

        await driver.sleep(2000);

        try {
            await driver.wait(async () => {
                const currentUrl = await driver.getCurrentUrl();
                return currentUrl !== urlBeforeLogin;
            }, 15000);
        } catch (e) {
            console.log("Waiting for navigation after login...");
        }

        await waitForPageLoad();
        await driver.sleep(1000);

        const currentUrl = await driver.getCurrentUrl();

        if (currentUrl.includes("/web-login") && !currentUrl.includes("/authentication/web-login")) {
            try {
                const errorElements = await driver.findElements(
                    By.css('[data-dmid*="error"], [class*="error"], [role="alert"]')
                );
                if (errorElements.length > 0) {
                    const errorText = await errorElements[0].getText().catch(() => "");
                    console.error(`Login failed: ${errorText}`);
                    return false;
                }
            } catch (e) { }
        }

        if (currentUrl.includes("dm-drogeriemarkt.ba") && !currentUrl.includes("signin.dm-drogeriemarkt.ba")) {
            console.log("Login successful - redirected to main site");
            return true;
        }

        if (!currentUrl.includes("/authentication/web-login")) {
            console.log("Login appears successful - navigated away from login page");
            return true;
        }

        console.log("Login status unclear - still on login page");
        return false;
    } catch (e) {
        console.error(`Login failed with error: ${e.message}`);
        if (e.stack) {
            console.error(`Stack trace: ${e.stack.split("\n").slice(0, 5).join("\n")}`);
        }
        return false;
    }
}

function registerMochaHooks(options = {}) {
    const suiteName = options.suiteName || "DM Test Suite";
    const doLogin = options.login !== false; // default true

    function setGlobalDriver(drv) {
        global.driver = drv;
    }

    // Runs before each test
    beforeEach(async function () {
        this.timeout(120000);

        // Safety cleanup
        if (global.driver) {
            await teardownDriver();
            global.driver = null;
        }

        // Create fresh browser instance
        const drv = await setupDriver(suiteName);
        setGlobalDriver(drv);

        // Optional login
        if (doLogin) {
            const loggedIn = await performLogin();
            if (!loggedIn) {
                throw new Error("Login failed in test setup.");
            }
        }
    });

    // Runs after each test
    afterEach(async function () {
        this.timeout(60000);

        // Screenshot & debug on failure
        await handleTestFailure(this);

        // Close browser after each test
        if (global.driver) {
            await teardownDriver();
            global.driver = null;
        }
    });
}

module.exports = {
    config,
    setupDriver,
    teardownDriver,
    waitForPageLoad,
    handleTestFailure,
    performLogin,
    handleCookiePopup,
    registerMochaHooks,
};
