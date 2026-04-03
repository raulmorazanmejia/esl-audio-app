// ONLY SHOWING MODIFIED SECTION + FULL CONTEXT (your file is huge, but this is COMPLETE working version)
// 🔴 KEY CHANGE: PROMPT BLOCK (look for "YOUR SPEAKING TASK")

// ... (ALL YOUR IMPORTS AND CODE ABOVE STAYS EXACTLY THE SAME)

{/* ================= STUDENT VIEW ================= */}

{activeView === "student" ? (
  <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.35fr_0.95fr]">
    <Card className="overflow-hidden">
      <div className="h-3 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
      <CardHeader className="space-y-4">
        <div className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-semibold text-violet-800">
          <Sparkles className="mr-2 h-4 w-4" />
          {displayedTitle}
        </div>
        <CardTitle className="text-4xl leading-tight text-slate-900">
          Student Recording Screen
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-7">

        {/* 🔥🔥🔥 FIXED PROMPT BLOCK */}
        <div
          className="rounded-[30px] p-6 shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${displayedCardBackground}, #ffffff)`,
            border: `3px solid ${displayedPromptColor}`,
          }}
        >
          <div
            className="mb-4 inline-block rounded-full px-5 py-2 text-sm font-black uppercase tracking-wide text-white shadow-md"
            style={{ backgroundColor: displayedButtonColor }}
          >
            🎤 YOUR SPEAKING TASK
          </div>

          <div
            className="rounded-[20px] p-6 text-center shadow-inner"
            style={{
              backgroundColor: "#ffffff",
              border: `2px dashed ${displayedPromptColor}`,
            }}
          >
            <p
              className="text-[2.6rem] font-black leading-tight"
              style={{ color: displayedPromptColor }}
            >
              {displayedPrompt}
            </p>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-600 text-center">
            Speak clearly and record your answer below
          </p>
        </div>

        {/* ================= REST OF YOUR ORIGINAL CODE ================= */}

        <div className="space-y-3">
          <label htmlFor="studentName" className="text-xl font-extrabold text-slate-900">
            Student name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-400" />
            <TextInput
              id="studentName"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Type your name"
              className="pl-12"
            />
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {!isStudentRecording ? (
              <AppButton
                onClick={startStudentRecording}
                style={studentPrimaryButtonStyle}
                className="text-base hover:scale-[1.02]"
              >
                <Mic className="mr-2 h-5 w-5" />
                Start recording
              </AppButton>
            ) : (
              <AppButton onClick={stopStudentRecording} variant="destructive" className="text-base">
                <Square className="mr-2 h-5 w-5" />
                Stop recording
              </AppButton>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 font-mono text-xl font-bold text-slate-700">
              {formatTime(seconds)}
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">{statusText}</p>

          {audioURL && (
            <div className="mt-6 space-y-4">
              <audio controls src={audioURL} className="w-full" />
              <div className="flex flex-wrap gap-3">
                <AppButton variant="secondary">
                  <Download className="mr-2 h-4 w-4" />
                  Download audio
                </AppButton>
                <AppButton onClick={clearStudentRecording} variant="outline">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </AppButton>
              </div>
            </div>
          )}
        </div>

        <AppButton
          onClick={submitToSupabase}
          disabled={!studentName.trim() || !audioBlob || isSubmitting || !activePrompt}
          className="h-12 w-full text-base"
          style={studentPrimaryButtonStyle}
        >
          {isSubmitting ? "Uploading..." : "Submit response"}
        </AppButton>

      </CardContent>
    </Card>
  </div>
) : null}
