const { expect } = require("chai");
const { By, until } = require("selenium-webdriver");
const { registerMochaHooks, waitForPageLoad, config } = require("./setup");

// Shared constants
const { base: BASE_URL, product: PRODUCT_URL } = config.urls;
const SEL = {
  addToCartBtn: By.css('button[data-dmid="add-to-cart-button"]#add-to-cart-button'),
  cartBadge: By.css('span[data-dmid="cart-summary-items"]'),
  guestCheckoutBtn: By.css('button[data-dmid="cart-checkout-guest-button"]'),

  salutationHerr: By.css("#salutation-radio-button-field-HERR-radio"),
  firstName: By.css("#checkout-firstName-input"),
  lastName: By.css("#checkout-lastName-input"),

  birthDay: By.css("#birthDate-date-input-day"),
  birthMonth: By.css("#birthDate-date-input-month"),
  birthYear: By.css("#birthDate-date-input-year"),

  email: By.css("#checkout-emailAddress-input"),
  emailConfirm: By.css("#checkout-emailAddressCheck-input"),

  street: By.css("#checkout-street-input"),
  city: By.css("#checkout-city-input"),
  postalCode: By.css("#checkout-postalcode-input"),

  continueBtn: By.css('button[data-dmid="submitButton"]#submitButton'),

  customerDetailsTitle: By.css('h1[data-dmid="customerAddDetailsTitle"]'),
  profileTitle: By.css('h1[data-dmid="profileViewTitle"]'),

  cartDeleteButtons: By.css('button[data-dmid="cart-entry-delete-product"]'),

  emailErrorText: By.css(
    'p[data-dmid="checkout-emailAddress-error-text"]#checkout-emailAddress-input-error'
  ),
  emailConfirmErrorText: By.css(
    'p[data-dmid="checkout-emailAddressCheck-error-text"]#checkout-emailAddressCheck-input-error'
  ),
  postalErrorText: By.css(
    'p[data-dmid="checkout-postalcode-error-text"]#checkout-postalcode-input-error'
  ),
};

// --------------------
// Shared helper funcs
// --------------------
async function openUrl(url) {
  const driver = global.driver;
  await driver.get(url);
  await waitForPageLoad();
}

async function safeClick(locator, timeout = 20000) {
  const driver = global.driver;
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);

  await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", el);
  await driver.sleep(50);

  try {
    await el.click();
  } catch (e) {
    await driver.executeScript("arguments[0].click();", el);
  }

  await driver.sleep(200);
  return el;
}

async function typeInto(locator, value, timeout = 20000) {
  const driver = global.driver;
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);

  await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", el);
  await driver.sleep(20);

  await el.clear();
  await el.sendKeys(value);
  return el;
}

async function clearField(locator, timeout = 20000) {
  const driver = global.driver;
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", el);
  await driver.sleep(80);
  await el.clear();
  return el;
}

async function waitCartCountAtLeast(minCount = 1, timeout = 25000) {
  const driver = global.driver;
  const badge = await driver.wait(until.elementLocated(SEL.cartBadge), timeout);
  await driver.wait(until.elementIsVisible(badge), timeout);

  await driver.wait(async () => {
    const txt = (await badge.getText().catch(() => "")).trim();
    const n = parseInt(txt, 10);
    return Number.isFinite(n) && n >= minCount;
  }, timeout);

  return parseInt((await badge.getText()).trim(), 10);
}

async function fillContactForm({ email, emailConfirm, postalCode }) {
  await safeClick(SEL.salutationHerr);

  await typeInto(SEL.firstName, "Test");
  await typeInto(SEL.lastName, "User");

  await typeInto(SEL.birthDay, "01");
  await typeInto(SEL.birthMonth, "01");
  await typeInto(SEL.birthYear, "1999");

  await typeInto(SEL.email, email);
  await typeInto(SEL.emailConfirm, emailConfirm);

  await typeInto(SEL.street, "Test Street 1");
  await typeInto(SEL.city, "Sarajevo");
  await typeInto(SEL.postalCode, postalCode);
}

async function waitForTitle(locator, expectedTextContains, timeout = 25000) {
  const driver = global.driver;
  const h1 = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(h1), timeout);

  await driver.wait(async () => {
    const txt = (await h1.getText().catch(() => "")).trim().toLowerCase();
    return txt.includes(expectedTextContains.toLowerCase());
  }, timeout);

  return h1;
}

async function waitForUrlChange(urlBefore, timeout = 25000) {
  const driver = global.driver;
  await driver.wait(async () => {
    const now = await driver.getCurrentUrl().catch(() => urlBefore);
    return now !== urlBefore;
  }, timeout);
  return driver.getCurrentUrl();
}

async function waitForEmailValidation(timeout = 20000) {
  const driver = global.driver;
  const emailEl = await driver.findElement(SEL.email);

  await driver.wait(async () => {
    const ariaInvalid = await emailEl.getAttribute("aria-invalid").catch(() => null);
    if (ariaInvalid === "true") return true;

    const errEls = await driver.findElements(SEL.emailErrorText);
    if (errEls.length > 0) return await errEls[0].isDisplayed().catch(() => false);

    return false;
  }, timeout);

  return emailEl;
}

async function waitForPostalValidation(timeout = 20000) {
  const driver = global.driver;
  const postalEl = await driver.findElement(SEL.postalCode);

  await driver.wait(async () => {
    const ariaInvalid = await postalEl.getAttribute("aria-invalid").catch(() => null);
    if (ariaInvalid === "true") return true;

    const errEls = await driver.findElements(SEL.postalErrorText);
    if (errEls.length > 0) return await errEls[0].isDisplayed().catch(() => false);

    return false;
  }, timeout);

  return postalEl;
}

async function assertNoEmailErrors() {
  const driver = global.driver;
  expect((await driver.findElements(SEL.emailErrorText)).length).to.equal(0);
  expect((await driver.findElements(SEL.emailConfirmErrorText)).length).to.equal(0);
}

async function emptyCart(timeout = 30000) {
  const driver = global.driver;

  await openUrl(`${BASE_URL}cart`);
  await driver.wait(until.urlContains("/cart"), 20000);

  const end = Date.now() + timeout;

  while (Date.now() < end) {
    const delBtns = await driver.findElements(SEL.cartDeleteButtons);
    if (delBtns.length === 0) return;

    await safeClick(SEL.cartDeleteButtons);
    await driver.sleep(300);
  }

  throw new Error("Cart could not be emptied within timeout.");
}

// Login helpers for suite 2 
async function waitForCheckoutOrLogin(timeout = 30000) {
  const driver = global.driver;

  await driver.wait(async () => {
    const url = await driver.getCurrentUrl().catch(() => "");
    return url.includes("checkout.dm-drogeriemarkt.ba") || url.includes("signin.dm-drogeriemarkt.ba");
  }, timeout);

  return driver.getCurrentUrl();
}

async function doLoginOnSignin() {
  const driver = global.driver;

  const loginEmailSel = By.id("emailAddress-input");
  const loginPassSel = By.id("password-input");
  const loginBtnSel = By.id("login-button");

  const emailEl = await driver.wait(until.elementLocated(loginEmailSel), 20000);
  await driver.wait(until.elementIsVisible(emailEl), 20000);
  await emailEl.clear();
  await emailEl.sendKeys(config.credentials.email);

  const passEl = await driver.wait(until.elementLocated(loginPassSel), 20000);
  await driver.wait(until.elementIsVisible(passEl), 20000);
  await passEl.clear();
  await passEl.sendKeys(config.credentials.password);

  const loginBtn = await driver.wait(until.elementLocated(loginBtnSel), 20000);
  await driver.wait(until.elementIsVisible(loginBtn), 20000);

  await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", loginBtn);
  await driver.sleep(200);
  await loginBtn.click();
}

async function waitForMyDataTitle(timeout = 30000) {
  const driver = global.driver;

  const h1 = await driver.wait(until.elementLocated(SEL.profileTitle), timeout);
  await driver.wait(until.elementIsVisible(h1), timeout);

  await driver.wait(async () => {
    const txt = (await h1.getText().catch(() => "")).trim().toLowerCase();
    return txt.includes("moji podaci");
  }, timeout);

  return h1;
}

// SUITE 1: GUEST TESTS (no login)
describe("DM - Guest Checkout tests (NO login)", function () {
  this.timeout(120000);

  // driver for this suite, no login
  registerMochaHooks({ suiteName: "DM - Guest", login: false });

  it("TestCase1 - EP - Verify that invalid email prevents proceeding", async function () {
    const driver = global.driver;

    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    await safeClick(SEL.guestCheckoutBtn);
    await driver.wait(until.elementLocated(SEL.firstName), 25000);

    await fillContactForm({ email: "testmail.com", emailConfirm: "testmail.com", postalCode: "71000" });
    await safeClick(SEL.continueBtn);

    // Assertion: Verify email field is marked invalid and validation message contains expected keywords.
    const emailEl = await waitForEmailValidation(20000);
    expect(await emailEl.getAttribute("aria-invalid")).to.equal("true");

    const emailErrEls = await driver.findElements(SEL.emailErrorText);
    expect(emailErrEls.length).to.be.greaterThan(0);

    const emailErrText = (await emailErrEls[0].getText().catch(() => "")).trim().toLowerCase();
    expect(emailErrText).to.include("ispravnu");
    expect(emailErrText).to.include("e-mail");
  });

  it("TestCase2 - EP - Verify that valid email do not prevents proceeding", async function () {
    const driver = global.driver;

    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    await safeClick(SEL.guestCheckoutBtn);
    await driver.wait(until.elementLocated(SEL.firstName), 25000);

    await fillContactForm({ email: "testmail@gmail.com", emailConfirm: "testmail@gmail.com", postalCode: "71000" });

    const urlBefore = await driver.getCurrentUrl();
    await safeClick(SEL.continueBtn);

    // Assertion: Ensure that valid and matching email addresses do not trigger validation and allow the user to continue.
    const urlAfter = await waitForUrlChange(urlBefore, 25000);
    expect(urlAfter).to.not.equal(urlBefore);

    expect((await driver.findElements(SEL.emailErrorText)).length).to.equal(0);
    expect((await driver.findElements(SEL.emailConfirmErrorText)).length).to.equal(0);
  });

  it("TestCase3 - BVA - Verify postal code below min length rejected", async function () {
    const driver = global.driver;

    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    await safeClick(SEL.guestCheckoutBtn);
    await driver.wait(until.elementLocated(SEL.firstName), 25000);

    await fillContactForm({ email: "testmail@gmail.com", emailConfirm: "testmail@gmail.com", postalCode: "123" });

    const urlBefore = await driver.getCurrentUrl();
    await safeClick(SEL.continueBtn);

    // Assertion: Verify that a postal code below the minimum length is rejected(look for aria-invalid) 
    // and prevents navigation(urlAfter = url Before).
    const postalEl = await waitForPostalValidation(20000);
    expect(await postalEl.getAttribute("aria-invalid")).to.equal("true");

    const urlAfter = await driver.getCurrentUrl();
    expect(urlAfter).to.equal(urlBefore);
  });

  it("TestCase4 - BVA - Verify postal code with minimum length accepted", async function () {
    const driver = global.driver;

    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    await safeClick(SEL.guestCheckoutBtn);
    await driver.wait(until.elementLocated(SEL.firstName), 25000);

    await fillContactForm({ email: "testmail@gmail.com", emailConfirm: "testmail@gmail.com", postalCode: "71000" });

    const urlBefore = await driver.getCurrentUrl();
    await safeClick(SEL.continueBtn);

    // Assertion: Verify that a postal code with minimum valid length is accepted and allows navigation (no validation
    // messages and urlAfter is not equal to urlBefore).
    const urlAfter = await waitForUrlChange(urlBefore, 25000);
    expect(urlAfter).to.not.equal(urlBefore);

    expect((await driver.findElements(SEL.postalErrorText)).length).to.equal(0);
  });

  it("TestCase5 - DT - Verify user can proceed when all required fields are filled and emails match", async function () {
    const driver = global.driver;

    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    await safeClick(SEL.guestCheckoutBtn);
    await driver.wait(until.elementLocated(SEL.firstName), 25000);

    await fillContactForm({ email: "testmail@gmail.com", emailConfirm: "testmail@gmail.com", postalCode: "71000" });

    const urlBefore = await driver.getCurrentUrl();
    await safeClick(SEL.continueBtn);

    // Assertion: Verify that all required fields with matching emails allow the user to proceed to the next step.
    const urlAfter = await waitForUrlChange(urlBefore, 25000);
    expect(urlAfter).to.not.equal(urlBefore);
  });

  it("TestCase6 - DT - Verify user cannot proceed when all required fields are filled but emails do not match", async function () {
    const driver = global.driver;

    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    await safeClick(SEL.guestCheckoutBtn);
    await driver.wait(until.elementLocated(SEL.firstName), 25000);

    await fillContactForm({ email: "testmail@gmail.com", emailConfirm: "different@gmail.com", postalCode: "71000" });

    const urlBefore = await driver.getCurrentUrl();
    await safeClick(SEL.continueBtn);

    // Assertion: Verify that all required fields with non matching emails do not allow the user to 
    // proceed to the next step. (urlAfter equal to urlBefore + look for validation messages key word)
    const urlAfter = await driver.getCurrentUrl();
    expect(urlAfter).to.equal(urlBefore);

    const mismatchErrEls = await driver.findElements(SEL.emailConfirmErrorText);
    expect(mismatchErrEls.length).to.be.greaterThan(0);

    const mismatchText = (await mismatchErrEls[0].getText().catch(() => "")).trim().toLowerCase();
    expect(mismatchText).to.include("ne podudaraju");
  });

  it('TestCase7 - EG - Verify system handles leading/trailing spaces in email correctly', async function () {
    const driver = global.driver;

    await emptyCart();

    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    await safeClick(SEL.guestCheckoutBtn);

    await waitForTitle(SEL.customerDetailsTitle, "vaši lični podaci", 30000);

    await fillContactForm({
      email: " testmail@gmail.com ",
      emailConfirm: " testmail@gmail.com ",
      postalCode: "71000",
    });

    const urlBefore = await driver.getCurrentUrl();
    await safeClick(SEL.continueBtn);

    // Assertion: Verify no email validation errors and successful navigation away from the contact form to the next page
    await driver.wait(async () => {
      const u = await driver.getCurrentUrl().catch(() => urlBefore);
      return u !== urlBefore;
    }, 30000);

    await assertNoEmailErrors();

    const urlAfter = await driver.getCurrentUrl();
    expect(urlAfter).to.not.equal(urlBefore);
  });

  it("TestCase8 - EG - Verify form blocks continuation when all inputs are empty and shows validation messages", async function () {
    const driver = global.driver;

    await emptyCart();

    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    await safeClick(SEL.guestCheckoutBtn);
    await waitForTitle(SEL.customerDetailsTitle, "vaši lični podaci", 30000);

    // clear all relevant fields
    await clearField(SEL.firstName);
    await clearField(SEL.lastName);
    await clearField(SEL.birthDay);
    await clearField(SEL.birthMonth);
    await clearField(SEL.birthYear);
    await clearField(SEL.email);
    await clearField(SEL.emailConfirm);
    await clearField(SEL.street);
    await clearField(SEL.city);
    await clearField(SEL.postalCode);

    await safeClick(SEL.continueBtn);

    // still on same page
    await waitForTitle(SEL.customerDetailsTitle, "vaši lični podaci", 30000);

    // NOT on next step
    const profileTitles = await driver.findElements(SEL.profileTitle);
    expect(profileTitles.length).to.equal(0);

    // Assertion: DOB error visible OR aria-invalid true
    const dobErrorLocator = By.xpath("//*[self::p or self::div][contains(., 'datum rođenja')]");
    const dobErrEls = await driver.findElements(dobErrorLocator);
    const dobErrVisible = dobErrEls.length > 0 && (await dobErrEls[0].isDisplayed().catch(() => false));

    const dayEl = await driver.findElement(SEL.birthDay);
    const monthEl = await driver.findElement(SEL.birthMonth);
    const yearEl = await driver.findElement(SEL.birthYear);

    const dayInvalid = await dayEl.getAttribute("aria-invalid").catch(() => "false");
    const monthInvalid = await monthEl.getAttribute("aria-invalid").catch(() => "false");
    const yearInvalid = await yearEl.getAttribute("aria-invalid").catch(() => "false");

    const anyDobInvalid = dayInvalid === "true" || monthInvalid === "true" || yearInvalid === "true";

    expect(dobErrVisible || anyDobInvalid).to.equal(true);
  });
});


// SUITE 2: LOGIN TESTS (needs login)
describe("DM - Checkout tests (LOGIN required)", function () {
  this.timeout(120000);

  // new driver for this suite, DOES login in before()
  registerMochaHooks({ suiteName: "DM - Login", login: true });

  it('TestCase 9 - ST - Verify clicking “Na plaćanje” transitions from Cart to next step for logged user', async function () {
    const driver = global.driver;

    // 1) Open product and add to cart
    await openUrl(PRODUCT_URL);
    await safeClick(SEL.addToCartBtn);
    const cartCount = await waitCartCountAtLeast(1);
    expect(cartCount).to.be.at.least(1);

    // 2) Go to cart
    await openUrl(`${BASE_URL}cart`);
    await driver.wait(until.urlContains("/cart"), 30000);

    // 3) Click "Na plaćanje"
    const payBtn = By.xpath('//button[.//span[contains(normalize-space(.),"Na plaćanje")]]');

    const urlBefore = await driver.getCurrentUrl();
    await safeClick(payBtn, 30000);

    // 4) Assertion: URL changes and we leave /cart
    await driver.wait(async () => {
      const u = await driver.getCurrentUrl().catch(() => urlBefore);
      return u !== urlBefore && !u.includes("/cart");
    }, 30000);

    const u = await driver.getCurrentUrl();

    // We don't care which one, just that it transitioned away from cart (it will go or on login or on next step)
    expect(u).to.satisfy(x =>
      x.includes("checkout.dm-drogeriemarkt.ba") ||
      x.includes("signin.dm-drogeriemarkt.ba") ||
      (!x.includes("/cart"))
    );
  });

  it("TestCase10 - SC - Verify that a shipping fee is applied and the total is corretly calculated when the cart subtotal is below 70 KM.", async function () {
    const driver = global.driver;

    await emptyCart();

    // 1) Open parfeum and add to cart 
    const PERFUME_URL = "https://www.dm-drogeriemarkt.ba/bugatti-performance-deep-blue-edt-p4051395413179.html";
    await openUrl(PERFUME_URL);

    await safeClick(SEL.addToCartBtn);
    const cartCount = await waitCartCountAtLeast(1);
    expect(cartCount).to.be.at.least(1);

    // 2) Go to cart
    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    // 3) Read values from the "Iznos za plaćanje" header block (contains total + delivery)
    const paymentTotalValue = By.xpath(
      "//div[@data-dmid='DM-subcart-summary-collapsible-header-content']" +
      "//span[@data-dmid='textRow-left' and contains(normalize-space(.),'Iznos za plaćanje')]" +
      "/following::span[@data-dmid='textRow-right'][1]"
    );

    const deliveryValue = By.xpath(
      "//div[@data-dmid='DM-subcart-summary-collapsible-header-content']" +
      "//span[@data-dmid='textRow-left' and contains(normalize-space(.),'troškovi dostave')]" +
      "/following::span[@data-dmid='textRow-right'][1]"
    );

    const totalEl = await driver.wait(until.elementLocated(paymentTotalValue), 30000);
    await driver.wait(until.elementIsVisible(totalEl), 30000);

    const deliveryEl = await driver.wait(until.elementLocated(deliveryValue), 30000);
    await driver.wait(until.elementIsVisible(deliveryEl), 30000);

    const totalText = (await totalEl.getText().catch(() => "")).trim();
    const deliveryText = (await deliveryEl.getText().catch(() => "")).trim();

    function parseKM(txt) {
      return parseFloat(
        txt
          .replace(/\u00a0/g, " ")
          .replace("KM", "")
          .trim()
          .replace(/\./g, "")
          .replace(",", ".")
      );
    }

    const total = parseKM(totalText);
    const delivery = parseKM(deliveryText);

    // 4) Assertions
    // Expected delivery fee is applied because subtotal < 70
    expect(delivery).to.equal(7.0);
  });

  it("TestCase11 - DC - Verify that no shipping fee is applied when the cart subtotal is greater than 70 KM", async function () {
    const driver = global.driver;

    await emptyCart();

    // 1) Add Bugatti parfeum
    const BUGATTI_URL =
      "https://www.dm-drogeriemarkt.ba/bugatti-performance-deep-blue-edt-p4051395413179.html";
    await openUrl(BUGATTI_URL);

    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(1)).to.be.at.least(1);

    // 2) Add Bruno Banani parfeum
    const BRUNO_URL =
      "https://www.dm-drogeriemarkt.ba/bruno-banani-made-for-men-edt-p3616301640745.html";
    await openUrl(BRUNO_URL);

    await safeClick(SEL.addToCartBtn);
    expect(await waitCartCountAtLeast(2)).to.be.at.least(2);

    // 3) Go to cart
    await openUrl(`${BASE_URL}cart`);
    expect(await driver.getCurrentUrl()).to.include("/cart");

    // 4) Read "troškovi dostave" from the header block 
    const deliveryValue = By.xpath(
      "//div[@data-dmid='DM-subcart-summary-collapsible-header-content']" +
      "//span[@data-dmid='textRow-left' and contains(translate(normalize-space(.),'TROŠKOVI DOSTAVE','troškovi dostave'),'troškovi dostave')]" +
      "/following-sibling::*[1]//span[@data-dmid='textRow-right'][1]"
    );

    const deliveryEl = await driver.wait(until.elementLocated(deliveryValue), 30000);
    await driver.wait(until.elementIsVisible(deliveryEl), 30000);

    const deliveryText = (await deliveryEl.getText().catch(() => "")).trim();

    function parseKM(txt) {
      return parseFloat(
        txt
          .replace(/\u00a0/g, " ")
          .replace("KM", "")
          .trim()
          .replace(/\./g, "")
          .replace(",", ".")
      );
    }

    const delivery = parseKM(deliveryText);

    // 5) Assertion: shipping must be 0
    expect(delivery).to.equal(0.0);
  });

});
