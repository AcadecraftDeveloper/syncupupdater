const ipcRenderer = require('electron').ipcRenderer;
var meetingId;
window.onload = function() {
    ipcRenderer.on("uuidChield", (event, data) => { 
        console.log('uuid from screen=>',data);
        document.getElementById("code").innerHTML = data;
    })
}

function startShare(){
    document.getElementById("start").style.display = "none";
    document.getElementById("stop").style.display = "block";
    ipcRenderer.send("start-share", {});
}

function stopShare(){
    document.getElementById("stop").style.display = "none";
    document.getElementById("start").style.display = "block";
    ipcRenderer.send("stop-share", {});
}