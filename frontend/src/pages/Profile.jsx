import React, { useState } from 'react';

// --- STYLES COMPONENT ---
// All SCSS has been converted to CSS and embedded here to make the component self-contained.
const ProfileStyles = () => (
    <style>{`
        :root {
            --c-bg: #0d1117;
            --c-panel: #161b22;
            --c-border: #30363d;
            --c-text-light: #e6edf3;
            --c-text-muted: #848d97;
            --c-primary: #58a6ff;
            --c-secondary: #a371f7;
            --c-accent: #3fb950;
            --c-danger: #f85149;
            --font-primary: 'Inter', sans-serif;
        }

        .profile-page {
            background-color: var(--c-bg);
            min-height: 100vh;
            padding: 2rem;
            font-family: var(--font-primary);
            color: var(--c-text-light);
        }

        .profile-container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .profile-header {
            background-color: var(--c-panel);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);
            margin-bottom: 2rem;
            border: 1px solid var(--c-border);
        }

        .profile-header .cover-photo {
            height: 220px;
            background: linear-gradient(135deg, rgba(88, 166, 255, 0.4), rgba(163, 113, 247, 0.4)), url('https://www.transparenttextures.com/patterns/stardust.png');
            background-size: cover, auto;
        }

        .profile-header .profile-details {
            padding: 0 2rem;
            display: flex;
            align-items: flex-end;
            position: relative;
            margin-top: -75px;
        }

        .profile-header .avatar-container {
            border: 5px solid var(--c-panel);
            border-radius: 50%;
            margin-right: 1.5rem;
            flex-shrink: 0;
        }
        
        .profile-header .avatar {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            display: block;
        }

        .profile-header .user-info {
            margin-bottom: 1.5rem;
        }
        
        .profile-header .user-info h1 { font-size: 2.25rem; font-weight: 700; margin: 0; }
        .profile-header .user-info p { font-size: 1rem; color: var(--c-text-muted); margin: 0.25rem 0 0; }

        .profile-header .user-bio {
            padding: 1rem 2rem 1.5rem;
            color: var(--c-text-muted);
            line-height: 1.6;
        }

        .profile-content {
            display: grid;
            grid-template-columns: 2.5fr 1fr;
            gap: 2rem;
        }

        .btn {
            border: none;
            padding: 0.6rem 1.2rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
        }

        .btn svg { width: 18px; height: 18px; }

        .btn-edit-profile {
            margin-left: auto;
            margin-bottom: 1.5rem;
            background-color: rgba(132, 141, 151, 0.1);
            border: 1px solid var(--c-border);
            color: var(--c-text-light);
        }
        
        .btn-edit-profile:hover { background-color: var(--c-border); }

        .card {
            background-color: var(--c-panel);
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid var(--c-border);
        }

        .card h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .card h3 svg { color: var(--c-text-muted); }

        .progress-card .progress-item {
            margin-bottom: 1.25rem;
        }
        .progress-card .progress-item p { margin: 0 0 0.5rem; color: var(--c-text-muted); }
        .progress-card .progress-bar-container {
            height: 8px;
            width: 100%;
            background-color: var(--c-bg);
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-card .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--c-secondary), var(--c-primary));
            border-radius: 4px;
            animation: progressBarAnimation 1s ease-out forwards;
        }
        .progress-card .progress-item span { float: right; font-size: 0.8rem; color: var(--c-text-muted); }

        .activity-card .activity-feed {
            list-style: none;
            padding: 0;
        }
        .activity-card .activity-feed li {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            align-items: center;
            gap: 1rem;
            padding: 1rem 0;
            border-bottom: 1px solid var(--c-border);
        }
        .activity-card .activity-feed li:last-child { border: none; }
        .activity-card .activity-feed li p { margin: 0; font-weight: 500; }
        .activity-card .difficulty {
            font-size: 0.8rem;
            font-weight: 600;
            padding: 0.2rem 0.5rem;
            border-radius: 15px;
            text-align: center;
        }
        .activity-card .difficulty.easy { background-color: rgba(63, 185, 80, 0.2); color: var(--c-accent); }
        .activity-card .difficulty.medium { background-color: rgba(255, 193, 7, 0.2); color: #ffc107; }
        .activity-card .difficulty.hard { background-color: rgba(248, 81, 73, 0.2); color: var(--c-danger); }
        .activity-card .activity-feed li span:last-child { color: var(--c-text-muted); font-size: 0.8rem; text-align: right; }

        .settings-card .settings-list {
            list-style: none; padding: 0; margin-bottom: 1.5rem;
        }
        .settings-card .settings-list li {
            font-size: 1rem; font-weight: 500; padding: 1rem;
            border-radius: 8px; cursor: pointer;
            transition: background-color 0.2s;
        }
        .settings-card .settings-list li:hover { background-color: var(--c-border); }
        
        .btn-logout {
            width: 100%;
            justify-content: center;
            background-color: rgba(248, 81, 73, 0.1);
            color: var(--c-danger);
            border: 1px solid var(--c-danger);
        }
        .btn-logout:hover { background-color: rgba(248, 81, 73, 0.2); }

        .modal-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(0,0,0,0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease;
        }
        .modal-content {
            background-color: var(--c-panel);
            border-radius: 12px;
            width: 100%;
            max-width: 500px;
            border: 1px solid var(--c-border);
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            animation: slideIn 0.3s ease-out;
        }
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--c-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h2 { margin: 0; }
        .btn-close-modal {
            background: none; border: none; color: var(--c-text-muted); cursor: pointer;
        }
        .btn-close-modal:hover { color: var(--c-text-light); }
        
        .modal-content form {
            padding: 1.5rem;
        }
        .modal-content .form-group {
            margin-bottom: 1.25rem;
        }
        .modal-content .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
        .modal-content .form-group input, .modal-content .form-group textarea {
            width: 100%;
            background-color: var(--c-bg);
            border: 1px solid var(--c-border);
            border-radius: 8px;
            padding: 0.75rem;
            color: var(--c-text-light);
            font-size: 1rem;
            box-sizing: border-box;
        }
        .modal-content .form-group input:focus, .modal-content .form-group textarea:focus { outline: none; border-color: var(--c-primary); }
        .modal-content .form-group textarea { resize: vertical; }

        .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--c-border);
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }
        
        .btn-secondary {
            background-color: var(--c-border);
            border: 1px solid var(--c-border);
            color: var(--c-text-light);
        }
        .btn-secondary:hover { background-color: #484f58; }
        
        .btn-primary { 
            background-color: var(--c-primary); 
            border: 1px solid var(--c-primary);
            color: white;
        }
        .btn-primary:hover { background-color: #4a9aff; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes progressBarAnimation { from { width: 0; } }

        @media (max-width: 992px) {
            .profile-content { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
            .profile-page { padding: 1rem; }
            .profile-header .profile-details {
                flex-direction: column; align-items: center; margin-top: -85px; padding-bottom: 1.5rem;
            }
            .profile-header .user-info { text-align: center; margin-bottom: 1rem; }
            .profile-header .btn-edit-profile { margin: 0; }
        }
    `}</style>
);


// --- SVG Icon Components ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const ProblemsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;


const Profile = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userData, setUserData] = useState({
        name: "Yasuu",
        username: "yashwant",
        bio: "Aspiring Full Stack Developer | Tech Enthusiast exploring the world of AI.",
    });

    const handleEditClick = () => setIsModalOpen(true);
    const handleModalClose = () => setIsModalOpen(false);
    
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleProfileSave = (e) => {
        e.preventDefault();
        console.log("Profile Saved:", userData);
        handleModalClose();
    };

    return (
        <>
            <ProfileStyles />
            <div className="profile-page">
                <div className="profile-container">
                    {/* --- Profile Header --- */}
                    <header className="profile-header">
                        <div className="cover-photo"></div>
                        <div className="profile-details">
                            <div className="avatar-container">
                                <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User Avatar" className="avatar" />
                            </div>
                            <div className="user-info">
                                <h1>{userData.name}</h1>
                                <p>@{userData.username}</p>
                            </div>
                            <button className="btn btn-edit-profile" onClick={handleEditClick}>
                                <EditIcon />
                                Edit Profile
                            </button>
                        </div>
                         <p className="user-bio">{userData.bio}</p>
                    </header>

                    {/* --- Main Content --- */}
                    <main className="profile-content">
                        {/* --- Left Panel --- */}
                        <div className="left-panel">
                            <div className="card progress-card">
                                <h3><ChartIcon /> Progress Report</h3>
                                <div className="progress-item">
                                    <p>Weekly Problems</p>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar" style={{width: '75%'}}></div>
                                    </div>
                                    <span>15 / 20</span>
                                </div>
                                 <div className="progress-item">
                                    <p>Learning Modules</p>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar" style={{width: '40%'}}></div>
                                    </div>
                                    <span>8 / 20</span>
                                </div>
                            </div>
                            <div className="card activity-card">
                                <h3><ProblemsIcon /> Solved Problems</h3>
                                <ul className="activity-feed">
                                    <li>
                                        <p>Two Sum</p>
                                        <span className="difficulty easy">Easy</span>
                                        <span>2 hours ago</span>
                                    </li>
                                    <li>
                                        <p>Reverse String</p>
                                        <span className="difficulty easy">Easy</span>
                                        <span>1 day ago</span>
                                    </li>
                                    <li>
                                        <p>Longest Substring Without Repeating Characters</p>
                                        <span className="difficulty medium">Medium</span>
                                        <span>3 days ago</span>
                                    </li>
                                     <li>
                                        <p>Median of Two Sorted Arrays</p>
                                        <span className="difficulty hard">Hard</span>
                                        <span>5 days ago</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* --- Right Panel --- */}
                        <div className="right-panel">
                            <div className="card settings-card">
                                <h3><SettingsIcon /> Settings</h3>
                                <ul className="settings-list">
                                    <li>Account</li>
                                    <li>Password</li>
                                    <li>Notifications</li>
                                    <li>Privacy</li>
                                    <li>Billing</li>
                                </ul>
                                <button className="btn btn-logout">
                                    <LogoutIcon />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </main>
                </div>

                {/* --- Edit Profile Modal --- */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Edit Profile</h2>
                                <button className="btn-close-modal" onClick={handleModalClose}><CloseIcon /></button>
                            </div>
                            <form onSubmit={handleProfileSave}>
                                <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <input type="text" id="name" name="name" value={userData.name} onChange={handleFormChange} />
                                </div>
                                 <div className="form-group">
                                    <label htmlFor="username">Username</label>
                                    <input type="text" id="username" name="username" value={userData.username} onChange={handleFormChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="bio">Bio</label>
                                    <textarea id="bio" name="bio" rows="3" value={userData.bio} onChange={handleFormChange}></textarea>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={handleModalClose}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Profile;

