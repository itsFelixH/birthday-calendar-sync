// Jest setup file

// Mock global variables and functions used in Google Apps Script
global.monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
global.monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// Mock Logger
global.Logger = {
  log: jest.fn()
};

// Mock Utilities
global.Utilities = {
  formatDate: jest.fn((date, tz, format) => {
    if (format === 'dd.MM.') return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`;
    if (format === 'dd.MM.yyyy') return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    if (format === 'MMMM') return global.monthNamesLong[date.getMonth()];
    return '';
  }),
  base64Encode: jest.fn((str) => Buffer.from(String(str)).toString('base64')),
  base64EncodeWebSafe: jest.fn((str) => Buffer.from(String(str)).toString('base64url')),
  sleep: jest.fn(),
  Charset: {
    UTF_8: 'UTF-8'
  }
};

// Mock Session
global.Session = {
  getScriptTimeZone: jest.fn().mockReturnValue('UTC'),
  getActiveUser: jest.fn().mockReturnValue({
    getEmail: jest.fn().mockReturnValue('test@example.com')
  })
};

// Mock CalendarApp
global.CalendarApp = {
  getCalendarById: jest.fn()
};

// Mock DriveApp
global.DriveApp = {
  getFileById: jest.fn().mockReturnValue({
    getName: jest.fn().mockReturnValue('Test Script')
  })
};

// Mock ScriptApp
global.ScriptApp = {
  getScriptId: jest.fn().mockReturnValue('test-script-id')
};

// Mock People API
global.People = {
  People: {
    Connections: {
      list: jest.fn()
    },
    getBatchGet: jest.fn()
  },
  ContactGroups: {
    list: jest.fn(),
    batchGet: jest.fn(),
    create: jest.fn()
  }
};

// Mock Gmail API
global.Gmail = {
  Users: {
    Messages: {
      send: jest.fn()
    }
  }
};

// Load source files into global scope (mimics Google Apps Script runtime)
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const loadOrder = [
  'config.js',
  'birthday_contact.js',
  'label_manager.js',
  'calendar_manager.js',
  'email_manager.js',
  'utils.js',
  'main.js'
];

loadOrder.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');
    // Replace const/let declarations with var so they don't throw on redeclaration
    code = code.replace(/^const /gm, 'var ');
    code = code.replace(/^let /gm, 'var ');
    // For class declarations, assign to global
    code = code.replace(/^class (\w+)/gm, 'global.$1 = class $1');
    // For function declarations, assign to global
    code = code.replace(/^function (\w+)/gm, 'global.$1 = function $1');
    // Evaluate in current context
    const fn = new Function(code);
    fn();
  }
});