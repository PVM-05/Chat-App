const https = require('http');

console.log('Testing Load Balancing...');
console.log('==========================');

async function testHealth() {
  for (let i = 1; i <= 10; i++) {
    try {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      console.log(`Request ${i}: ${data.instance}`);
    } catch (error) {
      console.log(`Request ${i}: ERROR`);
    }
  }
  console.log('==========================');
  console.log('Done!');
}

testHealth();