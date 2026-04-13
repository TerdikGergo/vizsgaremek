"use client";

type Props = {
  onBack: () => void;
};

const ABOUT_US_TEXT = [
  "Welcome to our car customization and performance simulation platform, a space designed for people who are passionate about vehicles, design, and technology. This program was created to give users more than just a simple configurator. It offers a complete interactive experience where style, engineering-inspired choices, and personalization come together in one place.",
  "The platform allows users to choose from different base car models and customize them in detail. From colors and light options to windows, spoilers, and hood variations, every choice helps create a unique final build. The goal is to let each user design a car that reflects their own taste and vision, whether that means a clean and elegant look or a more aggressive and sporty style.",
  "The experience goes beyond appearance. After customizing the exterior, users can continue to the engine section, where they can choose between Diesel/Gasoline and Electric setups. This adds a technical layer to the program and makes the project feel more complete. Users are not only shaping how the car looks, but also defining the type of powertrain behind it.",
  "To make the system even more detailed, the platform also includes a Materials Upgrade section. Here, users can choose between different engine-related parts and upgrade levels, creating a stronger connection between design and performance. This gives the impression of building a full concept car rather than only changing visual elements.",
  "A major part of the program is the ability to save projects. Each custom build can be stored in the database with its selected configuration, engine setup, and materials choices. This allows users to create their own garage of projects, return to earlier builds, continue customizing them, activate a favorite one, or delete builds they no longer need.",
  "The Garage page gives users an organized overview of their saved creations, while the homepage highlights the active project as the main car of the experience. This makes the platform feel personal and dynamic, because the user's own saved design becomes the center of the application.",
  "Overall, this project was built to combine creativity, personalization, and technical interaction in one modern automotive platform. It is a space where users do not just look at cars, but actively create, customize, and develop them. Our goal is to make the process enjoyable, detailed, and meaningful, giving every user the chance to turn their ideas into a fully defined digital car build.",
];

export default function AboutUs({ onBack }: Props) {
  return (
    <div className="home-root customizePage aboutPageRoot">
      <div className="customizeBg" aria-hidden="true">
        <div className="bgGlow" />
        <div className="bgGrid" />
        <div className="bgPanels">
          <span className="panel p1" />
          <span className="panel p2" />
          <span className="panel p3" />
          <span className="panel p4" />
        </div>
        <div className="bgCeilingLights">
          <span className="tube t1" />
          <span className="tube t2" />
          <span className="tube t3" />
          <span className="tube t4" />
        </div>
        <div className="bgVignette" />
      </div>

      <header className="customizeTop">
        <button type="button" onClick={onBack} className="backBtn" aria-label="Back" title="Back">
          <span className="backIcon" aria-hidden="true" />
        </button>

        <div className="topTitlePill">
          <span className="topTitleText">About Us</span>
        </div>
      </header>

      <main className="customizeMain aboutMain">
        <section className="stageWrap">
          <div className="stageCard aboutStageCard">
            <div className="aboutContent">
              <div className="aboutInner">
                {ABOUT_US_TEXT.map((paragraph) => (
                  <p key={paragraph} className="aboutParagraph">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
