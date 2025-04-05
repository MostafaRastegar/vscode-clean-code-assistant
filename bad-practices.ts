// simple-bad-practices.ts - Short code sample with multiple issues

// Variable name starts with uppercase (naming convention violation)
let User = {
  name: "John",
  email: "john@example.com",
};

// Very short and ambiguous names
function calc(a: number, b: number, t: string): number {
  let r = 0;

  // High complexity with nested conditions
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

// Class with multiple responsibilities (SRP violation)
class UserHandler {
  // Class name starts with lowercase letter
  private data: any = {};
  private logger: any;
  private db: any;

  constructor() {
    // Direct dependency on other classes (DIP violation)
    this.logger = new Logger();
    this.db = new Database("connection-string");
  }

  // Long parameter list
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
      password, // Storing password as plain text
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

  // Duplicated code from the function above
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

  // Additional responsibilities that don't belong in this class
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

// Primitive Obsession - should use an Address class instead
function formatAddress(
  street: string,
  city: string,
  state: string,
  zipCode: string,
  country: string
): string {
  return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
}

// Mockup example classes to complete the code
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

// Interface Segregation Principle violation - a large interface with multiple methods
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
