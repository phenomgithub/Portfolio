import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./Portfolio.css"; // Connects the layout styling file cleanly

const API_URL = "https://portfolio-q83w.onrender.com/api/projects";
const API_BASE = "https://portfolio-q83w.onrender.com/api"; // Base URL for the backend API
const DEFAULT_CV_URL = "/cv.pdf";

const normalizeCvUrl = (url) => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return DEFAULT_CV_URL;
  if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;

  const publicPath = trimmedUrl.replace(
    /^(?:\.\/)?(?:frontend\/)?public\//i,
    "/",
  );
  return publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
};

const EMPTY_EDUCATION_FORM = {
  id: "",
  degree: "",
  institution: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  description: "",
};

const EMPTY_EXPERIENCE_FORM = {
  id: "",
  role: "",
  company: "",
  employmentType: "",
  startDate: "",
  endDate: "",
  description: "",
};

export default function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [cvUrl, setCvUrl] = useState(DEFAULT_CV_URL);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [adminTab, setAdminTab] = useState("projects");
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    techStack: "",
    liveLink: "",
    githubLink: "",
  });
  const [educationForm, setEducationForm] = useState(EMPTY_EDUCATION_FORM);
  const [experienceForm, setExperienceForm] = useState(EMPTY_EXPERIENCE_FORM);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get(API_URL);
      setProjects(res.data);
    } catch (err) {
      console.error("Transmission data feed load failure:", err.message);
    }
  }, []);

  const fetchEducation = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/education`);
      setEducation(res.data);
    } catch (err) {
      console.error("Education records could not be loaded:", err.message);
    }
  }, []);

  const fetchExperience = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/experience`);
      setExperience(res.data);
    } catch (err) {
      console.error("Experience records could not be loaded:", err.message);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const load = (url, onLoad, label) => {
      axios
        .get(url)
        .then((res) => {
          if (isCurrent) onLoad(res.data);
        })
        .catch((err) => console.error(label, err.message));
    };

    load(API_URL, setProjects, "Transmission data feed load failure:");
    load(
      `${API_BASE}/education`,
      setEducation,
      "Education records could not be loaded:",
    );
    load(
      `${API_BASE}/experience`,
      setExperience,
      "Experience records could not be loaded:",
    );
    load(
      `${API_BASE}/profile`,
      (profile) => setCvUrl(normalizeCvUrl(profile.cvUrl || "")),
      "Portfolio profile could not be loaded:",
    );

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEducationInputChange = (e) => {
    setEducationForm({ ...educationForm, [e.target.name]: e.target.value });
  };

  const handleExperienceInputChange = (e) => {
    setExperienceForm({ ...experienceForm, [e.target.name]: e.target.value });
  };

  const handleAdminVerify = (e) => {
    e.preventDefault();
    // Secure access control password. Change string to update passcode.
    if (adminPassword === "sharif2026") {
      setIsAuthed(true);
    } else {
      alert("Unauthorized credential verification layout. Access denied.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      description: formData.description,
      techStack:
        typeof formData.techStack === "string"
          ? formData.techStack.split(",").map((item) => item.trim())
          : formData.techStack,
      liveLink: formData.liveLink,
      githubLink: formData.githubLink,
    };

    try {
      if (formData.id) {
        await axios.put(`${API_URL}/${formData.id}`, payload);
      } else {
        await axios.post(API_URL, payload);
      }
      resetForm();
      await fetchProjects();
    } catch (err) {
      console.error("CRUD processing loop exception:", err.message);
    }
  };

  const handleEdit = (project) => {
    setAdminTab("projects");
    setFormData({
      id: project.id,
      title: project.title,
      description: project.description,
      techStack: project.techstack ? project.techstack.join(", ") : "",
      liveLink: project.livelink || "",
      githubLink: project.githublink || "",
    });
  };

  const handleEducationSubmit = async (e) => {
    e.preventDefault();
    const { id, ...payload } = educationForm;
    try {
      if (id) {
        await axios.put(`${API_BASE}/education/${id}`, payload);
      } else {
        await axios.post(`${API_BASE}/education`, payload);
      }
      setEducationForm(EMPTY_EDUCATION_FORM);
      await fetchEducation();
    } catch (err) {
      console.error("Education record could not be saved:", err.message);
    }
  };

  const handleExperienceSubmit = async (e) => {
    e.preventDefault();
    const { id, ...payload } = experienceForm;
    try {
      if (id) {
        await axios.put(`${API_BASE}/experience/${id}`, payload);
      } else {
        await axios.post(`${API_BASE}/experience`, payload);
      }
      setExperienceForm(EMPTY_EXPERIENCE_FORM);
      await fetchExperience();
    } catch (err) {
      console.error("Experience record could not be saved:", err.message);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const normalizedCvUrl = normalizeCvUrl(cvUrl);
    try {
      const res = await axios.put(`${API_BASE}/profile`, {
        cvUrl: normalizedCvUrl,
      });
      setCvUrl(normalizeCvUrl(res.data.cvUrl || ""));
    } catch (err) {
      console.error("CV link could not be saved:", err.message);
    }
  };

  const handleDeleteRecord = async (resource, id) => {
    if (!window.confirm(`Delete this ${resource} record?`)) return;
    try {
      await axios.delete(`${API_BASE}/${resource}/${id}`);
      if (resource === "education") {
        setEducationForm(EMPTY_EDUCATION_FORM);
        await fetchEducation();
      } else {
        setExperienceForm(EMPTY_EXPERIENCE_FORM);
        await fetchExperience();
      }
    } catch (err) {
      console.error(`${resource} record could not be deleted:`, err.message);
    }
  };

  const handleEditEducation = (record) => {
    setAdminTab("education");
    setEducationForm({
      id: record.id,
      degree: record.degree,
      institution: record.institution,
      fieldOfStudy: record.field_of_study || "",
      startDate: record.start_date || "",
      endDate: record.end_date || "",
      description: record.description || "",
    });
  };

  const handleEditExperience = (record) => {
    setAdminTab("experience");
    setExperienceForm({
      id: record.id,
      role: record.role,
      company: record.company,
      employmentType: record.employment_type || "",
      startDate: record.start_date || "",
      endDate: record.end_date || "",
      description: record.description || "",
    });
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Confirm permanent removal of this entity record from Neon storage maps?",
      )
    ) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        resetForm();
        await fetchProjects();
      } catch (err) {
        console.error("Delete operation loop failure:", err.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      title: "",
      description: "",
      techStack: "",
      liveLink: "",
      githubLink: "",
    });
  };

  const formatPeriod = (startDate, endDate) => {
    const formatDate = (value) => {
      if (!value) return "";
      const date = new Date(`${value}-01T00:00:00`);
      return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en", { month: "short", year: "numeric" });
    };
    return [formatDate(startDate), formatDate(endDate || "Present")]
      .filter(Boolean)
      .join(" — ");
  };

  return (
    <div className="portfolio-page">
      <header className="navbar">
        <div className="logo-group">
          <h1 className="logo-title">SHARIF SHAGHIL</h1>
          <p className="logo-subtitle">FULL STACK DEVELOPER</p>
        </div>
        <button
          type="button"
          className="admin-toggle-btn"
          aria-label="Toggle admin dashboard"
          onClick={() => {
            setIsAdmin(!isAdmin);
            if (!isAdmin) setIsAuthed(false);
          }}
        >
          {isAdmin ? "Close Dashboard Console" : "🔒 Portal Admin"}
        </button>
      </header>

      {isAdmin && (
        <section className="drawer-overlay">
          {!isAuthed ? (
            <form onSubmit={handleAdminVerify} className="auth-box">
              <h4 className="auth-box-title">
                Enter admin passcode to access the dashboard
              </h4>
              <input
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="form-input"
                required
              />
              <button type="submit" className="btn-primary">
                Unlock dashboard
              </button>
            </form>
          ) : (
            <div className="form-container">
              <h3 className="panel-title">Portfolio dashboard</h3>
              <div
                className="admin-tabs"
                role="tablist"
                aria-label="Portfolio editor"
              >
                {["projects", "education", "experience", "profile"].map(
                  (tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={adminTab === tab}
                      className={`admin-tab${adminTab === tab ? " active" : ""}`}
                      onClick={() => setAdminTab(tab)}
                    >
                      {tab === "profile" ? "CV & profile" : tab}
                    </button>
                  ),
                )}
              </div>
              {adminTab === "projects" && (
                <form onSubmit={handleSubmit} className="grid-form">
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    placeholder="Project name"
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                  <input
                    type="text"
                    name="techStack"
                    value={formData.techStack}
                    placeholder="Technologies, separated by commas"
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                  <input
                    type="url"
                    name="liveLink"
                    value={formData.liveLink}
                    placeholder="Live project URL"
                    onChange={handleInputChange}
                    className="form-input"
                  />
                  <input
                    type="url"
                    name="githubLink"
                    value={formData.githubLink}
                    placeholder="GitHub repository URL"
                    onChange={handleInputChange}
                    className="form-input"
                  />
                  <textarea
                    name="description"
                    value={formData.description}
                    placeholder="Describe the project"
                    onChange={handleInputChange}
                    required
                    className="form-textarea"
                  />

                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      {formData.id ? "Save project changes" : "Add project"}
                    </button>
                    {formData.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(formData.id)}
                        className="btn-delete"
                      >
                        Delete project
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-cancel"
                    >
                      Clear form
                    </button>
                  </div>
                </form>
              )}
              {adminTab === "education" && (
                <form onSubmit={handleEducationSubmit} className="grid-form">
                  <input
                    name="degree"
                    value={educationForm.degree}
                    onChange={handleEducationInputChange}
                    placeholder="Degree or qualification"
                    className="form-input"
                    required
                  />
                  <input
                    name="institution"
                    value={educationForm.institution}
                    onChange={handleEducationInputChange}
                    placeholder="School, college, or university"
                    className="form-input"
                    required
                  />
                  <input
                    name="fieldOfStudy"
                    value={educationForm.fieldOfStudy}
                    onChange={handleEducationInputChange}
                    placeholder="Field of study"
                    className="form-input"
                  />
                  <div className="date-input-row">
                    <label className="date-field">
                      <span>Start date</span>
                      <input
                        type="month"
                        name="startDate"
                        value={educationForm.startDate}
                        onChange={handleEducationInputChange}
                        className="form-input"
                      />
                    </label>
                    <label className="date-field">
                      <span>End date</span>
                      <input
                        type="month"
                        name="endDate"
                        value={educationForm.endDate}
                        onChange={handleEducationInputChange}
                        className="form-input"
                      />
                    </label>
                  </div>
                  <textarea
                    name="description"
                    value={educationForm.description}
                    onChange={handleEducationInputChange}
                    placeholder="Optional highlights, coursework, or achievements"
                    className="form-textarea"
                  />
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      {educationForm.id ? "Save education" : "Add education"}
                    </button>
                    {educationForm.id && (
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() =>
                          handleDeleteRecord("education", educationForm.id)
                        }
                      >
                        Delete record
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setEducationForm(EMPTY_EDUCATION_FORM)}
                    >
                      Clear form
                    </button>
                  </div>
                </form>
              )}
              {adminTab === "experience" && (
                <form onSubmit={handleExperienceSubmit} className="grid-form">
                  <input
                    name="role"
                    value={experienceForm.role}
                    onChange={handleExperienceInputChange}
                    placeholder="Role or job title"
                    className="form-input"
                    required
                  />
                  <input
                    name="company"
                    value={experienceForm.company}
                    onChange={handleExperienceInputChange}
                    placeholder="Company or organization"
                    className="form-input"
                    required
                  />
                  <input
                    name="employmentType"
                    value={experienceForm.employmentType}
                    onChange={handleExperienceInputChange}
                    placeholder="Employment type (e.g. Full-time, Internship)"
                    className="form-input"
                  />
                  <div className="date-input-row">
                    <label className="date-field">
                      <span>Start date</span>
                      <input
                        type="month"
                        name="startDate"
                        value={experienceForm.startDate}
                        onChange={handleExperienceInputChange}
                        className="form-input"
                      />
                    </label>
                    <label className="date-field">
                      <span>End date</span>
                      <input
                        type="month"
                        name="endDate"
                        value={experienceForm.endDate}
                        onChange={handleExperienceInputChange}
                        className="form-input"
                      />
                    </label>
                  </div>
                  <textarea
                    name="description"
                    value={experienceForm.description}
                    onChange={handleExperienceInputChange}
                    placeholder="Describe your responsibilities and impact"
                    className="form-textarea"
                  />
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      {experienceForm.id ? "Save experience" : "Add experience"}
                    </button>
                    {experienceForm.id && (
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() =>
                          handleDeleteRecord("experience", experienceForm.id)
                        }
                      >
                        Delete record
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setExperienceForm(EMPTY_EXPERIENCE_FORM)}
                    >
                      Clear form
                    </button>
                  </div>
                </form>
              )}
              {adminTab === "profile" && (
                <form onSubmit={handleProfileSubmit} className="grid-form">
                  <label className="profile-link-label" htmlFor="cv-url">
                    CV PDF URL or public file path
                  </label>
                  <input
                    id="cv-url"
                    type="text"
                    value={cvUrl}
                    onChange={(e) => setCvUrl(e.target.value)}
                    placeholder="/cv.pdf"
                    className="form-input"
                  />
                  <p className="form-help">
                    Add the PDF to the site’s public folder and enter its path,
                    or use a link to a hosted PDF.
                  </p>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Save CV link
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      )}

      <div className="main-wrapper">
        <section className="hero-section">
          <h2 className="hero-greeting">
            I build thoughtful digital products, from the first idea to
            production.
          </h2>
          <p className="hero-bio">
            Computer Science Engineering graduate focused on full-stack web
            development and native desktop applications. I enjoy building
            reliable experiences with React, Node.js, PostgreSQL, and Electron.
          </p>
          <div className="hero-actions">
            <a href="#projects" className="hero-primary-link">
              Explore my work
            </a>
            <a
              href={cvUrl}
              download="Sharif-Shaghil-CV.pdf"
              className="hero-secondary-link"
            >
              Download CV <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="badge-row">
            <span className="hero-badge">JavaScript (ES6+)</span>
            <span className="hero-badge">React.js</span>
            <span className="hero-badge">Node.js / Express</span>
            <span className="hero-badge">PostgreSQL (Neon)</span>
            <span className="hero-badge">HTML</span>
            <span className="hero-badge">CSS</span>
            <span className="hero-badge">MongoDB</span>
          </div>
        </section>

        <section className="timeline-section education-section" id="education">
          <div className="section-heading-layout">
            <span className="section-index">📋</span>
            <h3 className="section-title-text">Education</h3>
          </div>
          {education.length ? (
            <div className="timeline-list">
              {education.map((record) => (
                <article
                  key={record.id}
                  className={`timeline-card education-card${isAdmin && isAuthed ? " editable-card" : ""}`}
                  onClick={() =>
                    isAdmin && isAuthed && handleEditEducation(record)
                  }
                >
                  <span className="timeline-marker" aria-hidden="true" />
                  <div className="timeline-card-top">
                    <div>
                      <h4 className="timeline-title">{record.degree}</h4>
                      <p className="timeline-subtitle">{record.institution}</p>
                    </div>
                    <span className="timeline-period">
                      {formatPeriod(record.start_date, record.end_date)}
                    </span>
                  </div>
                  {record.field_of_study && (
                    <p className="timeline-field">{record.field_of_study}</p>
                  )}
                  {record.description && (
                    <p className="timeline-description">{record.description}</p>
                  )}
                  {isAdmin && isAuthed && (
                    <span className="timeline-edit-hint">Select to edit</span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Education details will appear here once added from the admin
              dashboard.
            </p>
          )}
        </section>

        <section
          className="timeline-section experience-section"
          id="experience"
        >
          <div className="section-heading-layout">
            <span className="section-index">📋</span>
            <h3 className="section-title-text">Experience</h3>
          </div>
          {experience.length ? (
            <div className="timeline-list">
              {experience.map((record) => (
                <article
                  key={record.id}
                  className={`timeline-card experience-card${isAdmin && isAuthed ? " editable-card" : ""}`}
                  onClick={() =>
                    isAdmin && isAuthed && handleEditExperience(record)
                  }
                >
                  <span className="timeline-marker" aria-hidden="true" />
                  <div className="timeline-card-top">
                    <div>
                      <h4 className="timeline-title">{record.role}</h4>
                      <p className="timeline-subtitle">{record.company}</p>
                    </div>
                    <span className="timeline-period">
                      {formatPeriod(record.start_date, record.end_date)}
                    </span>
                  </div>
                  {record.employment_type && (
                    <span className="employment-badge">
                      {record.employment_type}
                    </span>
                  )}
                  {record.description && (
                    <p className="timeline-description">{record.description}</p>
                  )}
                  {isAdmin && isAuthed && (
                    <span className="timeline-edit-hint">Select to edit</span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Experience details will appear here once added from the admin
              dashboard.
            </p>
          )}
        </section>

        <section className="portfolio-grid-wrapper" id="projects">
          <div className="section-heading-layout">
            <span className="section-index">📋</span>
            <h3 className="section-title-text">Selected projects</h3>
          </div>

          <div className="project-list-container">
            {projects.length ? (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={`project-row-item${isAdmin && isAuthed ? " editable-card" : ""}`}
                  onClick={() => isAdmin && isAuthed && handleEdit(project)}
                >
                  <div className="row-main-meta">
                    <div className="row-header-line">
                      <h4 className="project-title-text">{project.title}</h4>
                      {isAdmin && isAuthed && (
                        <span className="edit-badge">⚙️ Config Active</span>
                      )}
                    </div>
                    <p className="project-description-paragraph">
                      {project.description}
                    </p>

                    <div className="row-tech-stack-row">
                      {project.techstack &&
                        project.techstack.map((tech, index) => (
                          <span key={index} className="minimal-tech-tag">
                            {tech}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="row-interactive-links-block">
                    {project.livelink && (
                      <a
                        href={project.livelink}
                        target="_blank"
                        rel="noreferrer"
                        className="anchor-action-link"
                      >
                        Live Application ↗
                      </a>
                    )}
                    {project.githublink && (
                      <a
                        href={project.githublink}
                        target="_blank"
                        rel="noreferrer"
                        className="anchor-action-link-secondary"
                      >
                        Source Index ↗
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">
                Projects will appear here once added from the admin dashboard.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
