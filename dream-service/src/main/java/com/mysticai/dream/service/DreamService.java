package com.mysticai.dream.service;

import com.mysticai.dream.dto.DreamRequest;
import com.mysticai.dream.dto.DreamResponse;
import com.mysticai.dream.entity.Dream;
import com.mysticai.dream.repository.DreamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DreamService {

    private final DreamRepository dreamRepository;
    private final DreamEventPublisher dreamEventPublisher;

    public DreamService(DreamRepository dreamRepository, DreamEventPublisher dreamEventPublisher) {
        this.dreamRepository = dreamRepository;
        this.dreamEventPublisher = dreamEventPublisher;
    }

    @Transactional
    public DreamResponse saveDream(DreamRequest request, Long userId) {
        Dream dream = new Dream();
        dream.setUserId(userId);
        dream.setDreamText(request.dreamText());
        dream.setMood(request.mood());
        dream.setDreamDate(LocalDate.now());
        dream.setInterpretationStatus(Dream.InterpretationStatus.PENDING);

        Dream savedDream = dreamRepository.save(dream);

        // Publish AI analysis request asynchronously
        dreamEventPublisher.publishDreamAnalysisRequest(
                userId,
                request.dreamText(),
                savedDream.getId()
        );

        return DreamResponse.from(savedDream);
    }

    @Transactional(readOnly = true)
    public List<DreamResponse> getUserDreams(Long userId) {
        return dreamRepository.findByUserIdOrderByDreamDateDesc(userId)
                .stream()
                .map(DreamResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DreamResponse getDreamById(Long id) {
        return dreamRepository.findById(id)
                .map(DreamResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("Dream not found with id: " + id));
    }
}
