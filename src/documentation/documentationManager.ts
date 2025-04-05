// src/documentation/documentationManager.ts
import * as vscode from "vscode";
import { IssueType } from "../models/codeIssue";

/**
 * Manages documentation for clean code principles
 */
export class DocumentationManager {
  /**
   * Returns the documentation for a specific issue type
   */
  public getDocumentationForIssueType(issueType: IssueType): DocumentationItem {
    switch (issueType) {
      case IssueType.Complexity:
        return this.getComplexityDocumentation();

      case IssueType.Naming:
        return this.getNamingDocumentation();

      case IssueType.DuplicateCode:
        return this.getDuplicateCodeDocumentation();

      case IssueType.SolidViolation:
        return this.getSolidPrinciplesDocumentation();

      case IssueType.AntiPattern:
        return this.getAntiPatternDocumentation();

      default:
        return {
          title: "Clean Code Principle",
          description:
            "Writing clean, maintainable code is essential for long-term project success.",
          principles: [
            "Keep functions and classes small and focused",
            "Use clear and descriptive names",
            "Avoid duplication (DRY principle)",
            "Write tests for your code",
            "Follow SOLID principles",
          ],
          examples: {
            bad: "function doStuff(d) { /* hundreds of lines of code */ }",
            good: "function calculateTotalPrice(products) { /* clear, focused logic */ }",
          },
          references: [
            {
              title: "Clean Code: A Handbook of Agile Software Craftsmanship",
              url: "https://www.oreilly.com/library/view/clean-code-a/9780136083238/",
            },
            {
              title: "The Clean Coder",
              url: "https://www.oreilly.com/library/view/the-clean-coder/9780132542913/",
            },
          ],
        };
    }
  }

  /**
   * Returns specific documentation items
   */
  public getComplexityDocumentation(): DocumentationItem {
    return {
      title: "Function Complexity",
      description:
        "Functions should be small and focused on a single task. High cyclomatic complexity makes code harder to understand, test, and maintain.",
      principles: [
        "Functions should do one thing, and do it well",
        "Keep functions small, ideally less than 20 lines",
        "Avoid deep nesting of conditionals",
        "Extract complex conditional logic into helper functions with descriptive names",
        "Each function should have one level of abstraction",
      ],
      examples: {
        bad: `function processData(data) {
  let result = [];
  if (data.type === 'A') {
    for (let i = 0; i < data.items.length; i++) {
      if (data.items[i].active) {
        if (data.items[i].value > 100) {
          result.push(data.items[i]);
        } else if (data.items[i].priority === 'high') {
          result.push(data.items[i]);
        }
      }
    }
  } else if (data.type === 'B') {
    // More nested conditionals...
  }
  return result;
}`,
        good: `function processData(data) {
  if (data.type === 'A') {
    return processTypeAData(data.items);
  }
  return processTypeBData(data.items);
}

function processTypeAData(items) {
  return items.filter(item => isActiveAndRelevant(item));
}

function isActiveAndRelevant(item) {
  return item.active && (item.value > 100 || item.priority === 'high');
}`,
      },
      references: [
        {
          title: "Clean Code: Chapter 3 - Functions",
          url: "https://www.oreilly.com/library/view/clean-code-a/9780136083238/",
        },
        {
          title: "Cyclomatic Complexity",
          url: "https://en.wikipedia.org/wiki/Cyclomatic_complexity",
        },
        {
          title: "Refactoring: Improving the Design of Existing Code",
          url: "https://martinfowler.com/books/refactoring.html",
        },
      ],
    };
  }

  public getNamingDocumentation(): DocumentationItem {
    return {
      title: "Meaningful Naming",
      description:
        "Good names are essential for readability and maintainability. Names should be descriptive, intention-revealing, and follow consistent conventions.",
      principles: [
        "Use intention-revealing names that clearly communicate purpose",
        "Choose pronounceable and searchable names",
        "Use consistent naming conventions (camelCase, PascalCase, etc.)",
        "Class names should be nouns, method names should be verbs",
        "Avoid encodings and abbreviations unless universally understood",
        "Names should reflect the level of abstraction of the class or function",
        "Names should be context-appropriate and neither too short nor too long",
      ],
      examples: {
        bad: `let d; // elapsed time in days
function calcTD() { /* ... */ }
const yyyymmdstr = moment().format('YYYY/MM/DD');`,
        good: `let elapsedTimeInDays;
function calculateTotalDistance() { /* ... */ }
const currentDate = moment().format('YYYY/MM/DD');`,
      },
      references: [
        {
          title: "Clean Code: Chapter 2 - Meaningful Names",
          url: "https://www.oreilly.com/library/view/clean-code-a/9780136083238/",
        },
        {
          title: "The Art of Readable Code",
          url: "https://www.oreilly.com/library/view/the-art-of/9781449318482/",
        },
      ],
    };
  }

  public getDuplicateCodeDocumentation(): DocumentationItem {
    return {
      title: "Avoiding Duplication (DRY Principle)",
      description:
        "The DRY (Don't Repeat Yourself) principle states that every piece of knowledge or logic should have a single, unambiguous representation within a system.",
      principles: [
        "Extract duplicated code into reusable functions or classes",
        "Make each piece of knowledge have a single, authoritative representation",
        "Look for structural duplication, not just textual duplication",
        "Use design patterns to eliminate duplication",
        "Apply abstraction to capture common behavior",
        "Refactor to eliminate duplication as soon as you identify it",
      ],
      examples: {
        bad: `function validateEmail(email) {
  const re = /\\S+@\\S+\\.\\S+/;
  return re.test(email);
}

function validateContactForm(form) {
  // Duplicate email validation
  const re = /\\S+@\\S+\\.\\S+/;
  if (!re.test(form.email)) {
    return false;
  }
  // More validation...
}`,
        good: `function validateEmail(email) {
  const re = /\\S+@\\S+\\.\\S+/;
  return re.test(email);
}

function validateContactForm(form) {
  if (!validateEmail(form.email)) {
    return false;
  }
  // More validation...
}`,
      },
      references: [
        {
          title: "The DRY Principle Explained",
          url: "https://thevaluable.dev/dry-principle-cost-benefit-example/",
        },
        {
          title: "Don't Repeat Yourself",
          url: "https://en.wikipedia.org/wiki/Don%27t_repeat_yourself",
        },
        {
          title: "Clean Code: Chapter 4 - Comments",
          url: "https://www.oreilly.com/library/view/clean-code-a/9780136083238/",
        },
      ],
    };
  }

  public getSolidPrinciplesDocumentation(): DocumentationItem {
    return {
      title: "SOLID Principles",
      description:
        "SOLID is an acronym for five design principles intended to make object-oriented designs more understandable, flexible, and maintainable.",
      principles: [
        "Single Responsibility Principle (SRP): A class should have only one reason to change",
        "Open/Closed Principle (OCP): Software entities should be open for extension but closed for modification",
        "Liskov Substitution Principle (LSP): Objects should be replaceable with instances of their subtypes without altering program correctness",
        "Interface Segregation Principle (ISP): Many client-specific interfaces are better than one general-purpose interface",
        "Dependency Inversion Principle (DIP): Depend on abstractions, not concretions",
      ],
      examples: {
        bad: `// Violates SRP
class User {
  constructor(name) {
    this.name = name;
  }
  
  saveToDatabase() { /* ... */ }
  generateReport() { /* ... */ }
  sendEmail() { /* ... */ }
}`,
        good: `// Follows SRP
class User {
  constructor(name) {
    this.name = name;
  }
}

class UserRepository {
  saveUser(user) { /* ... */ }
}

class ReportGenerator {
  generateUserReport(user) { /* ... */ }
}

class EmailService {
  sendEmailToUser(user, message) { /* ... */ }
}`,
      },
      references: [
        {
          title: "SOLID Principles of Object-Oriented Design",
          url: "https://en.wikipedia.org/wiki/SOLID",
        },
        {
          title: "SOLID Principles Explained",
          url: "https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design",
        },
        {
          title:
            "Design Patterns: Elements of Reusable Object-Oriented Software",
          url: "https://www.oreilly.com/library/view/design-patterns-elements/0201633612/",
        },
      ],
    };
  }

  public getAntiPatternDocumentation(): DocumentationItem {
    return {
      title: "Code Anti-Patterns",
      description:
        "Anti-patterns are common solutions to problems that create more problems than they solve. Recognizing and avoiding them improves code quality and maintainability.",
      principles: [
        "God Object: Avoid classes that know or do too much",
        "Feature Envy: Methods that use more features of another class than their own",
        "Primitive Obsession: Using primitive types instead of small objects for simple tasks",
        "Shotgun Surgery: When a change requires updates in many different classes",
        "Long Parameter List: Too many parameters make methods hard to use and understand",
        "Data Clumps: Groups of data items that always appear together",
        "Divergent Change: When a class changes for multiple reasons",
        "Speculative Generality: Adding abstraction that isn't needed yet",
      ],
      examples: {
        bad: `// God Object
class OrderProcessor {
  validateOrder(order) { /* ... */ }
  calculateTaxes(order) { /* ... */ }
  applyDiscounts(order) { /* ... */ }
  processPayment(order) { /* ... */ }
  updateInventory(order) { /* ... */ }
  sendConfirmationEmail(order) { /* ... */ }
  generateInvoice(order) { /* ... */ }
  updateAccountingSystem(order) { /* ... */ }
}`,
        good: `// Focused responsibilities
class OrderValidator {
  validate(order) { /* ... */ }
}

class TaxCalculator {
  calculateTaxes(order) { /* ... */ }
}

class DiscountService {
  applyDiscounts(order) { /* ... */ }
}

class PaymentProcessor {
  processPayment(order) { /* ... */ }
}

// And so on...`,
      },
      references: [
        {
          title:
            "AntiPatterns: Refactoring Software, Architectures, and Projects in Crisis",
          url: "https://en.wikipedia.org/wiki/AntiPatterns",
        },
        {
          title: "Refactoring: Improving the Design of Existing Code",
          url: "https://martinfowler.com/books/refactoring.html",
        },
        {
          title: "Code Smells",
          url: "https://sourcemaking.com/refactoring/smells",
        },
      ],
    };
  }

  /**
   * Returns a list of all clean code topics
   */
  public getAllTopics(): TopicItem[] {
    return [
      {
        id: "general",
        title: "Clean Code Principles",
        description:
          "General principles and practices for writing clean, maintainable code",
      },
      {
        id: "complexity",
        title: "Function Complexity",
        description: "Keeping functions small, focused, and easy to understand",
      },
      {
        id: "naming",
        title: "Meaningful Naming",
        description:
          "Choosing good names for variables, functions, classes, and other identifiers",
      },
      {
        id: "dry",
        title: "DRY Principle",
        description: "Don't Repeat Yourself - avoiding duplication in code",
      },
      {
        id: "solid",
        title: "SOLID Principles",
        description:
          "Five design principles for more maintainable and extensible code",
      },
      {
        id: "antipatterns",
        title: "Code Anti-Patterns",
        description: "Common problematic code patterns to avoid",
      },
      {
        id: "refactoring",
        title: "Refactoring Techniques",
        description:
          "Methods for improving code structure without changing its behavior",
      },
      {
        id: "testing",
        title: "Unit Testing",
        description: "Writing effective tests for clean, maintainable code",
      },
    ];
  }

  /**
   * Returns documentation for a specific topic
   */
  public getDocumentationForTopic(topicId: string): DocumentationItem {
    switch (topicId) {
      case "complexity":
        return this.getComplexityDocumentation();

      case "naming":
        return this.getNamingDocumentation();

      case "dry":
        return this.getDuplicateCodeDocumentation();

      case "solid":
        return this.getSolidPrinciplesDocumentation();

      case "antipatterns":
        return this.getAntiPatternDocumentation();

      case "refactoring":
        return {
          title: "Refactoring Techniques",
          description:
            "Refactoring is the process of restructuring code without changing its external behavior. It improves code quality and maintainability.",
          principles: [
            "Extract Method: Move code fragment into a new method",
            "Extract Class: Create a new class for responsibilities that belong together",
            "Inline Method: Replace method calls with the method's body",
            "Introduce Parameter Object: Replace multiple parameters with an object",
            "Replace Conditional with Polymorphism: Move each leg of a conditional to an overriding method",
            "Extract Interface: Pull up common methods to create an interface",
            "Move Method: Move a method to a class where it belongs",
            "Rename: Change names to better reflect purpose",
          ],
          examples: {
            bad: `function calculateTotal(order) {
  let total = 0;
  for (const item of order.items) {
    // Calculate price with tax
    const price = item.price * (1 + order.taxRate);
    // Apply discounts
    let discountedPrice = price;
    if (order.hasDiscount && item.isDiscountable) {
      discountedPrice = price * 0.9;
    }
    total += discountedPrice;
  }
  return total;
}`,
            good: `function calculateTotal(order) {
  return order.items.reduce((total, item) => {
    return total + calculateItemTotal(item, order);
  }, 0);
}

function calculateItemTotal(item, order) {
  const priceWithTax = applyTax(item.price, order.taxRate);
  return applyDiscount(priceWithTax, item, order);
}

function applyTax(price, taxRate) {
  return price * (1 + taxRate);
}

function applyDiscount(price, item, order) {
  if (order.hasDiscount && item.isDiscountable) {
    return price * 0.9;
  }
  return price;
}`,
          },
          references: [
            {
              title: "Refactoring: Improving the Design of Existing Code",
              url: "https://martinfowler.com/books/refactoring.html",
            },
            {
              title: "Refactoring Techniques",
              url: "https://refactoring.guru/refactoring/techniques",
            },
          ],
        };

      case "testing":
        return {
          title: "Unit Testing",
          description:
            "Unit testing ensures your code works as expected and makes refactoring safer. Clean code is usually easier to test.",
          principles: [
            "Tests should be fast, independent, repeatable, self-validating, and timely (FIRST)",
            "Follow the Arrange-Act-Assert pattern",
            "Test one concept per test",
            "Keep tests clean and maintainable just like production code",
            "Use descriptive test names that explain the expected behavior",
            "Don't test private methods directly",
            "Prefer testing behavior over implementation details",
            "Use test doubles (mocks, stubs, etc.) to isolate the code being tested",
          ],
          examples: {
            bad: `test('it works', () => {
  const calculator = new Calculator();
  calculator.add(2, 3);
  calculator.subtract(10, 5);
  calculator.multiply(4, 5);
  expect(calculator.getResult()).toBe(25);
})`,
            good: `test('add: should add two positive numbers correctly', () => {
  // Arrange
  const calculator = new Calculator();
  const a = 2, b = 3;
  
  // Act
  const result = calculator.add(a, b);
  
  // Assert
  expect(result).toBe(5);
});

test('subtract: should handle negative results', () => {
  // Arrange
  const calculator = new Calculator();
  const a = 5, b = 10;
  
  // Act
  const result = calculator.subtract(a, b);
  
  // Assert
  expect(result).toBe(-5);
});`,
          },
          references: [
            {
              title: "Clean Code: Chapter 9 - Unit Tests",
              url: "https://www.oreilly.com/library/view/clean-code-a/9780136083238/",
            },
            {
              title: "Test Driven Development: By Example",
              url: "https://www.oreilly.com/library/view/test-driven-development/0321146530/",
            },
            {
              title: "FIRST Principles of Unit Testing",
              url: "https://github.com/ghsukumar/SFDC_Best_Practices/wiki/F.I.R.S.T-Principles-of-Unit-Testing",
            },
          ],
        };

      case "general":
      default:
        return {
          title: "Clean Code Principles",
          description:
            "Clean code is code that is easy to read, understand, and modify. It follows a consistent style, is well-organized, and expresses the intent of the programmer clearly.",
          principles: [
            "Keep functions small and focused on a single task",
            "Use meaningful and intention-revealing names",
            'Comments should explain "why", not "what" (the code should be self-explanatory)',
            "Follow the DRY (Don't Repeat Yourself) principle",
            "Follow SOLID principles for object-oriented design",
            "Keep nesting levels low to improve readability",
            "Write tests for your code",
            "Refactor regularly to improve code quality",
            "Be consistent in coding style and conventions",
          ],
          examples: {
            bad: `function x(a, b) {
  var temp = a * 10;
  if (b > 10) { temp += 50; }
  if (b < 0) { temp -= 10; }
  return temp;
}`,
            good: `function calculateAdjustedValue(baseValue, modifier) {
  let result = baseValue * 10;
  
  if (modifier > 10) {
    result += 50;
  }
  
  if (modifier < 0) {
    result -= 10;
  }
  
  return result;
}`,
          },
          references: [
            {
              title: "Clean Code: A Handbook of Agile Software Craftsmanship",
              url: "https://www.oreilly.com/library/view/clean-code-a/9780136083238/",
            },
            {
              title: "The Clean Coder",
              url: "https://www.oreilly.com/library/view/the-clean-coder/9780132542913/",
            },
            {
              title: "Code Complete",
              url: "https://www.oreilly.com/library/view/code-complete-2nd/0735619670/",
            },
          ],
        };
    }
  }
}

/**
 * Interface for documentation items
 */
export interface DocumentationItem {
  title: string;
  description: string;
  principles: string[];
  examples: {
    bad: string;
    good: string;
  };
  references: {
    title: string;
    url: string;
  }[];
}

/**
 * Interface for topic items in the documentation
 */
export interface TopicItem {
  id: string;
  title: string;
  description: string;
}
