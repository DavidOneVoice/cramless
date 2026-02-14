export default function Start() {
  return (
    <>
      <header className="startHeader">
        <div className="logoBox" aria-label="CramLess logo">
          CL
        </div>

        <div>
          <h1 className="title">CramLess</h1>
          <p className="subtitle">A Smart Study Planner & Quiz Builder</p>
        </div>
      </header>

      <main className="card">
        <h2 className="sectionTitle">What this is for</h2>
        <p>
          CramLess helps students plan study time intelligently (based on course
          workload and exam dates) and practice what they learn using generated
          quizzes and flashcards.
        </p>

        <h2 className="sectionTitle">How to start</h2>
        <ol className="steps">
          <li>Add your courses and exam dates.</li>
          <li>Select your available study days and preferred study times.</li>
          <li>Generate a balanced study schedule.</li>
          <li>Paste your course material to generate practice quizzes.</li>
        </ol>

        <p className="footerNote">
          Use the navigation at the top to open the Study Planner or Quiz
          Builder.
        </p>
      </main>

      <footer className="footer">
        <p>
          Developed by <strong>OLUBUKOLA DEBORAH ODEDAIRO</strong>.
        </p>
        <p>
          Developed as a final project for an <strong>MS</strong> at{" "}
          <strong>St. Mary’s University</strong>.
        </p>
      </footer>
    </>
  );
}
