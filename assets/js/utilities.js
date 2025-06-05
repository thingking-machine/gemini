/**
 * Transforms platoHtml format to MPUJ (Multi-part User JSON) format.
 * @param {string} platoHtml - The platoHtml formatted string.
 * @returns {string} - JSON array of message objects with utterances of participants as 'parts'.
 */
function platoHtmlToMpuj(platoHtml) {
  if (!platoHtml || typeof platoHtml !== 'string') {
    throw new Error('Invalid input: platoHtml must be a non-empty string');
  }

  const messages = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(platoHtml, 'text/html');
  const paragraphs = doc.querySelectorAll('p.dialogue');

  paragraphs.forEach(p => {
    const speakerSpan = p.querySelector('span.speaker');
    if (!speakerSpan) return; // Skip malformed paragraphs

    const speaker = speakerSpan.textContent.trim();
    const utterance = p.textContent.replace(speakerSpan.textContent, '').replace(/:\s*/, '').trim();

    let role = 'user';
    if (speaker.toUpperCase() === machineConfig.name) {
      role = 'assistant';
    } else if (speaker.toUpperCase() === 'INSTRUCTIONS') {
      role = 'system';
    }

    messages.push({
      role: role,
      name: speaker,
      content: utterance
    });
  });

  return messages
}

/**
 * Transforms platoHtml format to platoText format.
 * @param {string} platoHtml - The platoHtml formatted string.
 * @returns {string} - The platoText formatted string.
 */
function platoHtmlToPlatoText(platoHtml) {
  if (typeof platoHtml !== 'string') { // Allow empty string
    throw new Error('Invalid input: platoHtml must be a string');
  }
  if (!platoHtml.trim()) {
    return '';
  }

  let result = '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(platoHtml, 'text/html');
  const paragraphs = doc.querySelectorAll('p.dialogue');

  paragraphs.forEach(p => {
    const speakerSpan = p.querySelector('span.speaker');
    if (!speakerSpan) return;

    const speaker = speakerSpan.textContent.trim();
    const utterance = p.textContent.replace(speakerSpan.textContent, '').replace(/:\s*/, '').trim();
    result += `${speaker}: ${utterance}\n\n`;
  });

  return result;
}

/**
 * Transforms platoText format to platoHtml format.
 * @param {string} platoText - The platoText formatted string.
 * @returns {string} - The platoHtml formatted string.
 */
function platoTextToPlatoHtml(platoText) {
  if (typeof platoText !== 'string') { // Allow empty string
    throw new Error('Invalid input: platoText must be a string');
  }
  // If platoText is an empty string or only whitespace, return an empty string.
  // The display logic will handle showing the file picker or placeholder.
  if (!platoText.trim()) {
    return '';
  }

  const regex = /([A-Za-z0-9_ -]+):\s*(.*?)\n\n/gs;
  let result = '';
  let match;

  while ((match = regex.exec(platoText)) !== null) {
    const speaker = match[1].trim();
    const utterance = match[2].trim().replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Escape HTML characters
    result += `<p class="dialogue"><span class="speaker">${speaker}</span> ${utterance}</p>\n`;
  }

  return result.trimEnd();
}

/**
 * Transforms platoText format to MPUJ (Multi-part User JSON) format.
 * @param {string} platoText - The platoText formatted string.
 * @returns {string} - JSON array of message objects with participants as 'parts'.
 */
function platoTextToMpuj(platoText) {
  if (!platoText || typeof platoText !== 'string') {
    throw new Error('Invalid input: platoText must be a non-empty string');
  }

  const regex = /([A-Za-z0-9_ -]+):\s*(.*?)\n\n/gs;
  const messages = [];
  let match;

  while ((match = regex.exec(platoText)) !== null) {
    const speaker = match[1].trim();
    const utterance = match[2].trim();

    let role = 'user';
    if (speaker.toUpperCase() === 'MACHINA RATIOCINATRIX') {
      role = 'assistant';
    } else if (speaker.toUpperCase() === 'INSTRUCTIONS') {
      role = 'system';
    }

    messages.push({
      role: role,
      name: speaker,
      content: utterance
    });
  }
  return messages
}

/**
 * Transforms a MPJ (Multi-part JSON) message to platoText format.
 * @param {Array<Object>} mpjMessage - a MPJ (Multi-part JSON) message object.
 *                                      Each object should have 'name' and 'content' properties.
 * @returns {string} - The platoText formatted string.
 */
function mpjToPlatoText(mpjMessage) {
  if (!Array.isArray(cmjMessages)) {
    console.error('Invalid input: cmjMessages must be an array.');
    // Consider throwing an error for more robust handling:
    // throw new Error('Invalid input: cmjMessages must be an array.');
    return ''; // Return empty string if input is not an array
  }
  let platoText = '';

  cmjMessages.forEach(message => {
    // Ensure the message object has the expected 'name' and 'content' properties
    if (message && typeof message.name === 'string' && typeof message.content === 'string') {
      const speaker = message.name.trim(); // Trim individual parts for cleanliness
      const utterance = message.content.trim(); // Trim individual parts for cleanliness

      // Append the formatted string, ensuring it ends with two newlines
      platoText += `${speaker}: ${utterance}\n\n`;
    } else {
      console.warn('Skipping malformed CMJ message object during CmjToPlatoText conversion:', message);
    }
  });
  return platoText;
}
