const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sg_email_send(data) {
    data.from = process.env.SENDGRID_SENDER_EMAIL;
    delete data.bcc;

    const tophtml = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head><body style="margin:0; padding:20px 0;font-size:18px;"><div style="margin:auto; padding:10px;">`;
    const foothtml = '</div></div></body></html>'
    data.html = tophtml + data.html + foothtml

    try {
        await sgMail.send(data);
        return { msg: 'success' };
    } catch (error) {
        console.error('sendgrid error:', error?.response?.body || error.message);
        return { msg: 'error' };
    }
}

module.exports = { sg_email_send }
