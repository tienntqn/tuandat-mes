// Thiết lập các CSS variables opacity cho màu primary (--primary01 đến --primary09)
// Zanex template dùng các biến này trong gradient, shadow, v.v.

function hexToRgba(hexValue, alpha) {
    if (!hexValue || hexValue.charAt(0) !== '#') return null;
    var hex = hexValue.slice(1);
    var chunkSize = Math.floor(hex.length / 3);
    var r = parseInt(hex.substr(0, chunkSize), 16);
    var g = parseInt(hex.substr(chunkSize, chunkSize), 16);
    var b = parseInt(hex.substr(chunkSize * 2, chunkSize), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

function applyPrimaryColorVars() {
    var primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-bg-color').trim() || '#6259ca';

    var html = document.querySelector('html');
    html.style.setProperty('--primary01', hexToRgba(primaryColor, 0.1));
    html.style.setProperty('--primary02', hexToRgba(primaryColor, 0.2));
    html.style.setProperty('--primary03', hexToRgba(primaryColor, 0.3));
    html.style.setProperty('--primary06', hexToRgba(primaryColor, 0.6));
    html.style.setProperty('--primary09', hexToRgba(primaryColor, 0.9));
}

applyPrimaryColorVars();
