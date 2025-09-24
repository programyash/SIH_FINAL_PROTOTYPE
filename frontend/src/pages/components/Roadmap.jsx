import React from "react";
import "../../scss/Roadmap.scss";

const Roadmap = ({ roadmap }) => {
    if (!roadmap || typeof roadmap === "string") return null;

    return (
        <div className="roadmap-display">
            {Object.keys(roadmap).map((level) => (
            <div key={level} className="roadmap-section">
                <h2 className="roadmap-level">
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                </h2>
                <div className="roadmap-cards">
                    {roadmap[level].map((item, idx) => (
                        <div key={idx} className="roadmap-card">
                            <h3>📌 {item.title}</h3>
                            <p>{item.description}</p>
                            <div className="resources">
                                <strong>Resources:</strong>
                                <ul>
                                    {item.resources.map((res, i) => (
                                    <li key={i}>
                                        <a href={res} target="_blank" rel="noopener noreferrer">
                                            {res}
                                        </a>
                                    </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            ))}
        </div>
    );
}

export default Roadmap;