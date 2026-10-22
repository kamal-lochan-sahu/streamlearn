const Assignment = require('../models/Assignment');
const Lecture = require('../models/Lecture');
const Content = require('../models/Content');
const {
  checkContentAccess,
  assertAllowed,
  loadManageableContent,
  canManageContent,
  CONTENT_ACCESS_FIELDS,
} = require('../services/access.service');
const {
  requireObjectId,
  requireText,
  requireHttpUrl,
  optionalString,
} = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const loadAssignment = async (id) => {
  requireObjectId(id, 'assignment id');
  const assignment = await Assignment.findById(id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  return assignment;
};

const contentOf = async (contentId) => {
  const content = await Content.findById(contentId).select(CONTENT_ACCESS_FIELDS);
  if (!content) throw new ApiError(404, 'Course not found');
  return content;
};

// Students see the assignment and THEIR OWN submission, never other students' work.
exports.getByLecture = asyncHandler(async (req, res) => {
  requireObjectId(req.params.lectureId, 'lecture id');
  const lecture = await Lecture.findById(req.params.lectureId).select('contentId');
  if (!lecture) throw new ApiError(404, 'Lecture not found');
  const content = await contentOf(lecture.contentId);
  assertAllowed(await checkContentAccess(req.user, content));

  const assignments = await Assignment.find({ lectureId: lecture._id }).lean();
  const manager = canManageContent(req.user, content);
  const me = String(req.user._id);
  res.json(
    new ApiResponse(
      200,
      assignments.map(({ submissions = [], ...rest }) =>
        manager
          ? { ...rest, submissions }
          : { ...rest, mySubmission: submissions.find((s) => String(s.userId) === me) || null }
      )
    )
  );
});

exports.submit = asyncHandler(async (req, res) => {
  const assignment = await loadAssignment(req.params.id);
  assertAllowed(await checkContentAccess(req.user, await contentOf(assignment.contentId)));

  const content = requireText(req.body.content, 'Answer', 10000);
  const attachments = req.body.attachments ?? [];
  if (!Array.isArray(attachments) || attachments.length > 5)
    throw new ApiError(400, 'At most 5 attachments');
  const links = attachments.map((a) => requireHttpUrl(a, 'Attachment link'));

  const entry = { userId: req.user._id, content, attachments: links, submittedAt: new Date() };

  // Resubmitting replaces the earlier answer (and clears its grade): one entry per student.
  // Mongoose's version check makes two parallel writes collide instead of overwriting each other,
  // so on a collision we simply load the fresh document and try again.
  for (let attempt = 1; ; attempt++) {
    const fresh = attempt === 1 ? assignment : await Assignment.findById(assignment._id);
    if (!fresh) throw new ApiError(404, 'Assignment not found');
    fresh.submissions = fresh.submissions.filter((s) => String(s.userId) !== String(req.user._id));
    fresh.submissions.push(entry);
    try {
      await fresh.save();
      break;
    } catch (err) {
      if (err.name !== 'VersionError' || attempt >= 3) throw err;
    }
  }
  res.json(new ApiResponse(200, {}, 'Assignment submitted'));
});

exports.getSubmissions = asyncHandler(async (req, res) => {
  const assignment = await loadAssignment(req.params.id);
  await loadManageableContent(req.user, assignment.contentId);
  res.json(new ApiResponse(200, assignment.submissions));
});

exports.create = asyncHandler(async (req, res) => {
  const { lectureId, contentId } = req.body;
  requireObjectId(contentId, 'content id');
  requireObjectId(lectureId, 'lecture id');
  await loadManageableContent(req.user, contentId);
  if (!(await Lecture.exists({ _id: lectureId, contentId })))
    throw new ApiError(400, 'Lecture does not belong to this content');

  const maxScore = req.body.maxScore === undefined ? 100 : Number(req.body.maxScore);
  if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000)
    throw new ApiError(400, 'Invalid maxScore');

  const assignment = await Assignment.create({
    lectureId,
    contentId,
    title: requireText(req.body.title, 'Title', 200),
    description: optionalString(req.body.description, 'Description', 5000),
    dueDate: req.body.dueDate,
    maxScore,
  });
  res.status(201).json(new ApiResponse(201, assignment));
});

exports.update = asyncHandler(async (req, res) => {
  const assignment = await loadAssignment(req.params.id);
  await loadManageableContent(req.user, assignment.contentId);

  if (req.body.title !== undefined) assignment.title = requireText(req.body.title, 'Title', 200);
  if (req.body.description !== undefined)
    assignment.description = optionalString(req.body.description, 'Description', 5000);
  if (req.body.dueDate !== undefined) assignment.dueDate = req.body.dueDate;
  if (req.body.maxScore !== undefined) {
    const maxScore = Number(req.body.maxScore);
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000)
      throw new ApiError(400, 'Invalid maxScore');
    assignment.maxScore = maxScore;
  }
  await assignment.save();
  res.json(new ApiResponse(200, assignment, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  const assignment = await loadAssignment(req.params.id);
  await loadManageableContent(req.user, assignment.contentId);
  await assignment.deleteOne();
  res.json(new ApiResponse(200, {}, 'Deleted'));
});
