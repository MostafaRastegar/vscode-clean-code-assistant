// simple-bad-practices.ts - نمونه کد کوتاه با مشکلات متعدد

// نام متغیر با حرف بزرگ شروع شده (نقض قرارداد نام‌گذاری)
let User = {
  name: "John",
  email: "john@example.com",
};

// نام‌های خیلی کوتاه و مبهم
function calc(a: number, b: number, t: string): number {
  let r = 0;

  // پیچیدگی بالا با شرط‌های تو در تو
  if (t === "add") {
    r = a + b;
  } else if (t === "sub") {
    r = a - b;
  } else if (t === "mul") {
    r = a * b;
  } else if (t === "div") {
    if (b !== 0) {
      r = a / b;
    } else {
      console.log("Error: Division by zero");
      r = 0;
    }
  } else {
    console.log("Unknown operation");
  }

  return r;
}

// کلاس با مسئولیت‌های متعدد (نقض SRP)
class UserHandler {
  // نام کلاس با حرف کوچک شروع شده
  private data: any = {};
  private logger: any;
  private db: any;

  constructor() {
    // وابستگی مستقیم به کلاس‌های دیگر (نقض DIP)
    this.logger = new Logger();
    this.db = new Database("connection-string");
  }

  // لیست پارامتر طولانی
  createUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    age: number,
    country: string
  ): boolean {
    // Validation
    if (firstName.length < 2) {
      this.logger.log("First name too short");
      return false;
    }

    if (lastName.length < 2) {
      this.logger.log("Last name too short");
      return false;
    }

    if (!email.includes("@")) {
      this.logger.log("Invalid email");
      return false;
    }

    if (password.length < 8) {
      this.logger.log("Password too short");
      return false;
    }

    if (age < 18) {
      this.logger.log("User must be at least 18 years old");
      return false;
    }

    // Store user
    this.data = {
      firstName,
      lastName,
      email,
      password, // ذخیره رمز عبور به صورت متن ساده
      age,
      country,
    };

    // Insert into database
    this.db.execute(
      `INSERT INTO users VALUES ('${firstName}', '${lastName}', '${email}', '${password}', ${age}, '${country}')`
    );

    // Log action
    this.logger.log(`User created: ${email}`);

    return true;
  }

  // کد تکراری با تابع بالا
  updateUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    age: number,
    country: string
  ): boolean {
    // Almost identical validation logic
    if (firstName.length < 2) {
      this.logger.log("First name too short");
      return false;
    }

    if (lastName.length < 2) {
      this.logger.log("Last name too short");
      return false;
    }

    if (!email.includes("@")) {
      this.logger.log("Invalid email");
      return false;
    }

    if (password.length < 8) {
      this.logger.log("Password too short");
      return false;
    }

    if (age < 18) {
      this.logger.log("User must be at least 18 years old");
      return false;
    }

    // Update user
    this.data = {
      firstName,
      lastName,
      email,
      password,
      age,
      country,
    };

    // Update database
    this.db.execute(
      `UPDATE users SET first_name='${firstName}', last_name='${lastName}', password='${password}', age=${age}, country='${country}' WHERE email='${email}'`
    );

    // Log action
    this.logger.log(`User updated: ${email}`);

    return true;
  }

  // مسئولیت‌های اضافی که در این کلاس نمی‌گنجد
  sendEmail(to: string, subject: string, body: string): void {
    console.log(`Sending email to ${to}: ${subject}`);
    // Implementation...
  }

  processPayment(userId: string, amount: number): boolean {
    console.log(`Processing payment of ${amount} for user ${userId}`);
    // Implementation...
    return true;
  }
}

// Primitive Obsession - باید از کلاس Address استفاده می‌شد
function formatAddress(
  street: string,
  city: string,
  state: string,
  zipCode: string,
  country: string
): string {
  return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
}

// مثال mockup برای تکمیل کد
class Logger {
  log(message: string): void {
    console.log(`LOG: ${message}`);
  }
}

class Database {
  constructor(private connectionString: string) {}

  execute(query: string): any {
    console.log(`Executing: ${query}`);
    return {};
  }
}

// Interface Segregation Principle violation - یک interface بزرگ با متدهای متعدد
interface UserRepository {
  createUser(user: any): void;
  updateUser(user: any): void;
  deleteUser(id: string): void;
  findUserById(id: string): any;
  findUsersByName(name: string): any[];
  findUsersByCountry(country: string): any[];
  resetPassword(id: string): void;
  activateUser(id: string): void;
  deactivateUser(id: string): void;
  sendWelcomeEmail(id: string): void;
}
