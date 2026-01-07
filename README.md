# Formal Methods – Seminar Project

This repository contains the seminar project for the course **Formal Methods**, focusing on the application of software testing techniques and automated test execution on a real-world web application.

The selected application for testing is the **DM drogerie markt Bosnia & Herzegovina** web shop:
https://www.dm-drogeriemarkt.ba/

---

## 📌 Project Scope

The goal of this project is to demonstrate the correct application of formal software testing techniques and to automate selected low-level test cases using **Selenium WebDriver**, **JavaScript**, and the **Mocha** testing framework.

The primary tested functionality includes:
- Guest checkout contact data validation
- Shopping cart behavior and delivery cost calculation
- Checkout flow transitions for guest and logged-in users

Login and registration functionalities were **not selected as the main tested functionality**, in accordance with the assignment requirements. Login is used only as a prerequisite for specific checkout-related scenarios.

---

## 🧪 Applied Testing Techniques

The following software testing techniques were applied and documented:

1. Equivalence Partitioning  
2. Boundary Value Analysis  
3. Decision Table Testing  
4. State Transition Testing  
5. Statement Coverage  
6. Decision Coverage  
7. Error Guessing  
8. Exploratory Testing  

Each technique is explained and supported with appropriate test cases and documentation.

---

## 📝 Test Case Design

- All test cases are written as **low-level test cases** using the template provided during lectures.
- Each test case includes:
  - Preconditions
  - Test steps
  - Expected results
- Test cases are documented in accompanying **PDF and XLSX files** included in this repository.

---

## 🤖 Test Automation

- **11 automated test cases** was implemented.
- Technologies used:
  - Selenium WebDriver
  - JavaScript
  - Mocha framework
- Each automated test:
  - Is implemented as a separate test case
  - Contains explicit assertions to validate expected behavior
- Shared **setup and teardown logic** is implemented in a single setup file.
- No absolute paths are used in element locators.

---

## 📁 Repository Structure
```txt
├── 3_Zadatak
│  ├── tests/            # Automated Selenium test suites
│   ├── setup.js         # Shared setup and teardown logic
│   └── dm_tests.test.js # Automated test cases
│  └── package.json
│  └──package-lock.json
├── README.md
├── LICENSE
├── 1_Zadatak_.pdf     # Seminar documentation
├── 2_Zadatak_.xlsx    # Test case documentation
├── 4_Zadatak_*.xlsx   # Decision tables and related artifacts
```

---

## ▶️ How to Run the Tests

### Prerequisites
- Node.js (LTS recommended)
- Google Chrome browser

### Installation
```bash
npm install

Run tests:
npm test
```

👥 Project Contributors

Students:
Edin Šehović (IB250211)
Almer Hodžić (IB190027)
Azemina Magrdžija (IB220257)

🎓 Course Information

Course: Formal Methods
Institution: Faculty of Information Technologies, University Džemal Bijedić of Mostar
Mentors:
prof. dr. Bernadin Ibrahimpašić
ass. Ahmet Mulalić

