const Feedback = require('../models/Feedback');

const clean = (value) => String(value || '').trim().replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
}[char]));

const submitFeedback = async (req, res) => {
  try {
    const { name, email, category, subject, message } = req.body;
    const errors = {};
    if (!name?.trim()) errors.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(email || '')) errors.email = 'Please enter a valid email address.';
    if (!category?.trim()) errors.category = 'Please select a feedback category.';
    if (!subject?.trim()) errors.subject = 'Please enter a subject.';
    if (!message?.trim()) errors.message = 'Please describe your feedback.';
    if (Object.keys(errors).length) return res.status(400).json({ success: false, errors });

    // Generate a dummy reference_id to satisfy the existing MongoDB unique index, even though we don't show it anymore.
    const reference_id = `FDB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await Feedback.create({ reference_id, name: clean(name), email: clean(email), category: clean(category), subject: clean(subject), message: clean(message) });
    res.status(201).json({ success: true, message: 'Thank you. Your feedback has been received.' });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ success: false, message: 'We could not submit your feedback. Please try again.' });
  }
};

const getPublicFeedback = async (req, res) => {
  try {
    const list = await Feedback.find()
      .select('name subject message category created_at -_id')
      .sort({ created_at: -1 })
      .limit(20);

    // Send submitter's first name + last initial only (handled here or can be done via frontend, but better here)
    const formattedData = list.map(item => {
      let nameParts = (item.name || '').split(' ');
      let displayName = nameParts[0];
      if (nameParts.length > 1) {
        displayName += ' ' + nameParts[nameParts.length - 1].charAt(0) + '.';
      }
      return {
        name: displayName,
        subject: item.subject,
        message: item.message,
        category: item.category,
        created_at: item.created_at
      };
    });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Fetch Public Feedback Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching public feedback.' });
  }
};

module.exports = { submitFeedback, getPublicFeedback };
