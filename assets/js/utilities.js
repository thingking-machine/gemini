/**
 * Transforms platoHtml format to MPUJ (Multi-Part User JSON) array
 * for Gemini API.
 * Consecutive non-model messages are grouped into a single 'user' message
 * with multiple parts. Each part includes the speaker's name and utterance.
 * Model messages have a single part with the utterance.
 *
 * @param {string} platoHtml - The platoHtml formatted string.
 * @returns {Array<Object>} - An array of message objects suitable for Gemini API `contents`.
 *                            Each object has 'role' ('user' or 'model') and 'parts' (an array of text parts).
 *                            Returns an empty array if platoHtml is empty or whitespace.
 * @throws {Error} If platoHtml is null, undefined, or not a string.
 * @throws {Error} If window.machineConfig or window.machineConfig.name is not available.
 */
function platoHtmlToMpuj(platoHtml) {
  if (platoHtml === null || typeof platoHtml !== 'string') {
    throw new Error('Invalid input: platoHtml must be a string.');
  }
  if (!platoHtml.trim()) {
    return []; // Return empty array for empty or whitespace-only HTML
  }

  if (!window.machineConfig || typeof window.machineConfig.name !== 'string' || !window.machineConfig.name.trim()) {
    console.error('platoHtmlToMpuj: machineConfig.name is not available or empty. Please ensure window.machineConfig.name is correctly set.');
    throw new Error('machineConfig.name is not configured. Cannot determine model messages.');
  }
  const modelNameUpper = window.machineConfig.name.toUpperCase();

  const mpujMessages = [];
  let currentUserParts = []; // To accumulate parts for the current user message

  const parser = new DOMParser();
  const doc = parser.parseFromString(platoHtml, 'text/html');
  const paragraphs = doc.querySelectorAll('p.dialogue');

  paragraphs.forEach(p => {
    const speakerSpan = p.querySelector('span.speaker');
    if (!speakerSpan) {
      console.warn('Skipping paragraph due to missing speaker span:', p.outerHTML);
      return; // Skip malformed paragraphs
    }

    const speaker = speakerSpan.textContent.trim();

    // Extract utterance: text after the speaker span, with leading colon/whitespace removed.
    const fullParaText = p.textContent || '';
    let utterance = fullParaText.substring(speakerSpan.textContent.length).trim();
    if (utterance.startsWith(':')) {
      utterance = utterance.substring(1).trim();
    }

    const isModelMessage = speaker.toUpperCase() === modelNameUpper;

    if (isModelMessage) {
      // If there are accumulated user parts, push them as a single user message first.
      if (currentUserParts.length > 0) {
        mpujMessages.push({ role: 'user', parts: currentUserParts });
        currentUserParts = []; // Reset for the next sequence of user messages
      }
      // Add the model message.
      mpujMessages.push({ role: 'model', parts: [{ text: utterance }] });
    } else {
      // This is a part of a user message (from any participant other than the model,
      // including "INSTRUCTIONS" if present).
      // The part includes the speaker's name and their utterance.
      currentUserParts.push({ text: `${speaker}: ${utterance}` });
    }
  });

  // After iterating through all paragraphs, if there are any remaining user parts, add them.
  if (currentUserParts.length > 0) {
    mpujMessages.push({ role: 'user', parts: currentUserParts });
  }

  return mpujMessages;
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
 * Transforms platoText format to MPUJ (Multi-Part User JSON) array
 * for Gemini API.
 * Consecutive non-model messages are grouped into a single 'user' message
 * with multiple parts. Each part includes the speaker's name and utterance.
 * Model messages have a single part with the utterance.
 *
 * @param {string} platoText - The platoText formatted string.
 * @returns {Array<Object>} - An array of message objects suitable for Gemini API `contents`.
 *                            Each object has 'role' ('user' or 'model') and 'parts' (an array of text parts).
 *                            Returns an empty array if platoText is empty or whitespace.
 * @throws {Error} If platoText is null, undefined, or not a string.
 * @throws {Error} If window.machineConfig or window.machineConfig.name is not available.
 */
function platoTextToMpuj(platoText) {
  if (platoText === null || typeof platoText !== 'string') {
    throw new Error('Invalid input: platoText must be a string.');
  }
  if (!platoText.trim()) {
    return []; // Return empty array for empty or whitespace-only text
  }

  if (!window.machineConfig || typeof window.machineConfig.name !== 'string' || !window.machineConfig.name.trim()) {
    console.error('platoTextToMpuj: machineConfig.name is not available or empty. Please ensure window.machineConfig.name is correctly set.');
    throw new Error('machineConfig.name is not configured. Cannot determine model messages.');
  }
  const modelNameUpper = window.machineConfig.name.toUpperCase();

  const mpujMessages = [];
  let currentUserParts = []; // To accumulate parts for the current user message

  // Regex to capture "Speaker: Utterance" followed by two newlines
  // It captures the speaker (group 1) and the utterance (group 2)
  const regex = /([A-Za-z0-9_ -]+):\s*([\s\S]*?)(?=\n\n[A-Za-z0-9_ -]+:|\n*$)/g;
  let match;

  // Iterate over all matches in the platoText
  // We need to adjust the regex or post-processing slightly because the original
  // regex /([A-Za-z0-9_ -]+):\s*(.*?)\n\n/gs might not capture the last utterance
  // if it's not followed by \n\n.
  // A simpler approach is to split by \n\n and then parse each block.

  const messageBlocks = platoText.trim().split(/\n\n+/); // Split by one or more pairs of newlines

  messageBlocks.forEach(block => {
    if (!block.trim()) return; // Skip empty blocks

    const parts = block.match(/^([A-Za-z0-9_ -]+):\s*([\s\S]*)$/);
    if (!parts || parts.length < 3) {
      console.warn('Skipping malformed message block in platoTextToMpuj:', block);
      return; // Skip malformed blocks
    }

    const speaker = parts[1].trim();
    const utterance = parts[2].trim();

    const isModelMessage = speaker.toUpperCase() === modelNameUpper;

    if (isModelMessage) {
      // If there are accumulated user parts, push them as a single user message first.
      if (currentUserParts.length > 0) {
        mpujMessages.push({ role: 'user', parts: currentUserParts });
        currentUserParts = []; // Reset for the next sequence of user messages
      }
      // Add the model message.
      mpujMessages.push({ role: 'model', parts: [{ text: utterance }] });
    } else {
      // This is a part of a user message (from any participant other than the model).
      // The part includes the speaker's name and their utterance.
      currentUserParts.push({ text: `${speaker}: ${utterance}` });
    }
  });

  // After iterating through all blocks, if there are any remaining user parts, add them.
  if (currentUserParts.length > 0) {
    mpujMessages.push({ role: 'user', parts: currentUserParts });
  }

  return mpujMessages;
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
