function formatPhoneNumber(number) {
    let jid = number;
    if (!jid.endsWith('@s.whatsapp.net')) {
        jid = jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }
    return jid;
}

function validatePhoneNumber(number) {
    if (!number || typeof number !== 'string') {
        return false;
    }
    
    const cleanNumber = number.replace(/[^0-9]/g, '');
    return cleanNumber.length >= 10 && cleanNumber.length <= 15;
}

module.exports = {
    formatPhoneNumber,
    validatePhoneNumber
};