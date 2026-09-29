export const digitalContact = {
  name: "Alecsander Lima",
  company: "Orquestra.CS",
  role: "Fundador - Tecnologia & Sistemas",
  phoneDisplay: "+55 15 99847-8705",
  phoneE164: "+5515998478705",
  email: "orquestracs@gmail.com",
  website: "https://portal.orquestracs.com",
  contactPage: "https://portal.orquestracs.com/contato",
  instagramHandle: "ORQUESTRA.CS",
  instagramUrl: "",
  whatsappMessage: "Olá, Alecsander! Conheci a Orquestra.CS através do seu crachá.",
} as const;

export function createVCard() {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${digitalContact.name}`,
    `ORG:${digitalContact.company}`,
    `TITLE:${digitalContact.role}`,
    `TEL;TYPE=CELL:${digitalContact.phoneE164}`,
    `EMAIL;TYPE=INTERNET:${digitalContact.email}`,
    `URL:${digitalContact.website}`,
    "END:VCARD",
  ].join("\r\n");
}
