const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const targetStr = `    <script>
      if ('serviceWorker' in navigator) {`;

const replacementStr = `    <script>
      window.onerror = function(msg, url, lineNo, columnNo, error) {
        var errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:red;position:fixed;top:0;left:0;z-index:9999;background:black;padding:20px;width:100%;font-size:12px;overflow-wrap:break-word;';
        errDiv.innerHTML = 'ERROR: ' + msg + '<br>' + (error ? error.stack : '');
        document.body.appendChild(errDiv);
        return false;
      };
      window.addEventListener('unhandledrejection', function(event) {
        var errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:orange;position:fixed;top:150px;left:0;z-index:9999;background:black;padding:20px;width:100%;font-size:12px;overflow-wrap:break-word;';
        errDiv.innerHTML = 'PROMISE ERROR: ' + (event.reason ? event.reason.stack || event.reason : 'Unknown');
        document.body.appendChild(errDiv);
      });
      if ('serviceWorker' in navigator) {`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('index.html', code);
console.log('Success index.html');
