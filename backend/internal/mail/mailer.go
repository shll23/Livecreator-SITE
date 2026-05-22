package mail

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// Mailer versendet E-Mails über einen beliebigen SMTP-Server (anbieterunabhängig).
type Mailer struct {
	host     string
	port     string
	user     string
	pass     string
	from     string
	fromName string
	enabled  bool
}

// NewMailer baut den Mailer aus den übergebenen Werten.
// Wenn host/user/pass leer sind, ist der Mailer deaktiviert (Mails werden nur geloggt).
func NewMailer(host, port, user, pass, from, fromName string) *Mailer {
	enabled := host != "" && user != "" && pass != ""
	if !enabled {
		log.Printf("[mail] Mailer DEAKTIVIERT (SMTP-Config unvollständig) — Mails werden nur geloggt")
	}
	return &Mailer{
		host: host, port: port, user: user, pass: pass,
		from: from, fromName: fromName, enabled: enabled,
	}
}

// Send verschickt eine HTML-Mail an einen Empfänger.
func (m *Mailer) Send(to, subject, htmlBody string) error {
	if !m.enabled {
		log.Printf("[mail] (deaktiviert) an=%s betreff=%q", to, subject)
		return nil
	}

	fromHeader := m.from
	if m.fromName != "" {
		fromHeader = fmt.Sprintf("%s <%s>", m.fromName, m.from)
	}

	var msg strings.Builder
	msg.WriteString("From: " + fromHeader + "\r\n")
	msg.WriteString("To: " + to + "\r\n")
	msg.WriteString("Subject: " + subject + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)

	auth := smtp.PlainAuth("", m.user, m.pass, m.host)
	addr := m.host + ":" + m.port

	if err := smtp.SendMail(addr, auth, m.from, []string{to}, []byte(msg.String())); err != nil {
		log.Printf("[mail] FEHLER an=%s: %v", to, err)
		return err
	}
	log.Printf("[mail] gesendet an=%s betreff=%q", to, subject)
	return nil
}
