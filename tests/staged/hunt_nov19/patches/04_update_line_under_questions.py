# hunt_nov19 04: the "New version ready - Reload" line sat ON TOP of the app's questions and over the active bar.
# The line was fixed 84 px from the bottom with z-index 8500. The app's questions (pbShowModal) are a bottom sheet at
# z-index 50, so on every phone size the line covered one of the question's buttons (the main button of a two-button
# question: End Run, Close Out Permit, Sign Report, a DO NOT ENTER answer) and put "Reload" in the middle of the button
# stack. With a run or permit in progress it also covered the active bar (the way back to the open permit).
# The line shows on every phone about 3 s after it opens once a release is out, until Reload or X is tapped.
# Now it follows the app's own layers: under questions and sheets (z-index 43: above the tabs 30 and the Feedback
# button 39, under the help sheet 45, the active bar 46, sheets 47-49, questions 50), and it sits above the tabs AND
# the active bar (the --pb-shell-h height the Feedback button already uses).
# Usage: python3 04_update_line_under_questions.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("line.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom, 0px));z-index:8500;margin:0 auto;max-width:480px;",
      "line.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(var(--pb-shell-h, 84px) + 10px);z-index:43;margin:0 auto;max-width:480px;")
p.save()
